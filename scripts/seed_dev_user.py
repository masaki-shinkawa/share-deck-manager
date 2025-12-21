import sys
import os
sys.path.append(os.getcwd())

from sqlmodel import Session, select
from api.database import engine
from api.models import User, Group, GroupMember
from uuid import UUID

def seed():
    with Session(engine) as session:
        dev_user_id = UUID("00000000-0000-0000-0000-000000000001")
        
        user = session.get(User, dev_user_id)
        if not user:
            print("Creating dev user...")
            user = User(
                id=dev_user_id,
                name="Dev User",
                email="dev@example.com",
                is_admin=True
            )
            session.add(user)
            session.commit()
            
            # Create default group
            group = Group(name="Dev Workspace")
            session.add(group)
            session.commit()
            
            member = GroupMember(
                group_id=group.id,
                user_id=user.id,
                role="owner"
            )
            session.add(member)
            session.commit()
            print("Dev user and group created.")
        else:
            print("Dev user already exists.")

if __name__ == "__main__":
    seed()
