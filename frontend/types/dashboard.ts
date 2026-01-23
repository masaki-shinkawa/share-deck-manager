/**
 * Dashboard component types and interfaces
 */

export interface DashboardUser {
  email: string;
  nickname?: string | null;
  role?: string | null;
  image?: string | null;
}

export interface DashboardCardProps {
  title: string;
  description: string;
  href?: string;
  icon: "arrow" | "lock";
  disabled?: boolean;
}

export interface UserInfoCardProps {
  user: DashboardUser;
}
