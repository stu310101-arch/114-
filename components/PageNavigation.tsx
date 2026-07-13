"use client";

import { routePath, type SiteRoute } from "./queryState";

type RouteLinkProps = {
  children: React.ReactNode;
  className?: string;
  route: SiteRoute;
  search?: string;
};

export function RouteLink({ children, className, route, search }: RouteLinkProps) {
  const path = routePath(route);
  const href = search ? `${path}?${search}` : path;

  return (
    <a className={className} href={href} suppressHydrationWarning>
      {children}
    </a>
  );
}

type SubpageHeaderProps = {
  kicker: string;
  title: string;
};

export function SubpageHeader({ kicker, title }: SubpageHeaderProps) {
  return (
    <header className="subpage-header">
      <RouteLink className="home-back-link" route="home">
        <span aria-hidden="true">←</span> 返回首頁
      </RouteLink>
      <div className="subpage-title">
        <span>{kicker}</span>
        <b>{title}</b>
      </div>
    </header>
  );
}

type PageNavigationProps = {
  nextLabel: string;
  nextRoute: SiteRoute;
  nextSearch?: string;
  previousLabel: string;
  previousRoute: SiteRoute;
  previousSearch?: string;
};

export function PageNavigation({
  nextLabel,
  nextRoute,
  nextSearch,
  previousLabel,
  previousRoute,
  previousSearch,
}: PageNavigationProps) {
  return (
    <nav className="page-step-navigation" aria-label="頁面導覽">
      <RouteLink
        className="page-previous"
        route={previousRoute}
        search={previousSearch}
      >
        <span aria-hidden="true">←</span> {previousLabel}
      </RouteLink>
      <RouteLink className="page-next" route={nextRoute} search={nextSearch}>
        {nextLabel} <span aria-hidden="true">→</span>
      </RouteLink>
    </nav>
  );
}
