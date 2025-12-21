from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from uuid import UUID

from ..database import get_session
from ..models import Group, GroupBase, GroupMember, User, Deck, DeckBase
from ..auth import get_current_user
from ..exceptions import APIError

router = APIRouter(prefix="/groups", tags=["groups"])

@router.get("", response_model=List[Group])
async def get_groups(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get groups the user belongs to"""
    if current_user.is_admin:
        return session.exec(select(Group)).all()
    
    # Join groups through group_members
    statement = (
        select(Group)
        .join(GroupMember)
        .where(GroupMember.user_id == current_user.id)
    )
    return session.exec(statement).all()

@router.post("", response_model=Group)
async def create_group(
    group_data: GroupBase,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Create a new group"""
    # Create group
    group = Group.model_validate(group_data)
    session.add(group)
    session.commit()
    session.refresh(group)
    
    # Add creator as owner
    member = GroupMember(
        group_id=group.id,
        user_id=current_user.id,
        role="owner"
    )
    session.add(member)
    session.commit()
    
    return group

@router.get("/{group_id}", response_model=Group)
async def get_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get group details"""
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check access
    if not current_user.is_admin:
        member = session.exec(
            select(GroupMember)
            .where(GroupMember.group_id == group_id)
            .where(GroupMember.user_id == current_user.id)
        ).first()
        if not member:
            raise HTTPException(status_code=403, detail="Access denied")
            
    return group

@router.get("/{group_id}/decks", response_model=List[Deck])
async def get_group_decks(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get decks in a group"""
    # Check access (reuse logic or make a dependency)
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if not current_user.is_admin:
        member = session.exec(
            select(GroupMember)
            .where(GroupMember.group_id == group_id)
            .where(GroupMember.user_id == current_user.id)
        ).first()
        if not member:
            raise HTTPException(status_code=403, detail="Access denied")
            
    return session.exec(select(Deck).where(Deck.group_id == group_id)).all()

@router.post("/{group_id}/decks", response_model=Deck)
async def create_deck_in_group(
    group_id: UUID,
    deck_data: DeckBase,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Create a new deck in a group"""
    # Check if user is member of group
    member = session.exec(
        select(GroupMember)
        .where(GroupMember.group_id == group_id)
        .where(GroupMember.user_id == current_user.id)
    ).first()
    
    if not member and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    deck = Deck(
        **deck_data.model_dump(),
        group_id=group_id,
        user_id=current_user.id
    )
    session.add(deck)
    session.commit()
    session.refresh(deck)
    return deck
