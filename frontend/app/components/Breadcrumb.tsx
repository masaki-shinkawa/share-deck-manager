import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export function Breadcrumb({ children }: { children: React.ReactNode }) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-400 mb-6">
      {children}
    </nav>
  );
}

export function BreadcrumbItem({
  href,
  children,
}: {
  href?: string;
  children: React.ReactNode;
}) {
  if (href) {
    return (
      <>
        <Link href={href} className="hover:text-white transition-colors">
          {children}
        </Link>
        <ChevronRight className="w-4 h-4" />
      </>
    );
  }
  return <span className="text-white font-medium">{children}</span>;
}
