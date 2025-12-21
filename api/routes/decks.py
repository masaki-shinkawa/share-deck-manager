from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from uuid import UUID

from ..database import get_session
from ..models import Deck, DeckBase, DeckUpdate, GroupMember, User
from ..auth import get_current_user

router = APIRouter(prefix="/decks", tags=["decks"])

@router.post("/{group_id}", response_model=Deck)
async def create_deck(
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

@router.get("/{deck_id}", response_model=Deck)
async def get_deck(
    deck_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    deck = session.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
        
    # Check group membership
    member = session.exec(
        select(GroupMember)
        .where(GroupMember.group_id == deck.group_id)
        .where(GroupMember.user_id == current_user.id)
    ).first()
    
    if not member and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
        
    return deck

@router.put("/{deck_id}", response_model=Deck)
async def update_deck(
    deck_id: UUID,
    deck_update: DeckUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    deck = session.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
        
    # Only creator or admin can update (Phase 1)
    if deck.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")
        
    deck_data = deck_update.model_dump(exclude_unset=True)
    for key, value in deck_data.items():
        setattr(deck, key, value)
        
    session.add(deck)
    session.commit()
    session.refresh(deck)
    return deck

@router.delete("/{deck_id}")
async def delete_deck(
    deck_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    deck = session.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
        
    # Only creator or admin can delete (Phase 1)
    if deck.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")
        
    session.delete(deck)
    session.commit()
    return {"ok": True}
