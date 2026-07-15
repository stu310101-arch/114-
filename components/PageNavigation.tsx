"use client";

import type { MouseEvent } from "react";
import { useNavigationLoading } from "./NavigationLoadingProvider";
import { routePath, type SiteRoute } from "./queryState";

type RouteLinkProps = {
  children: React.ReactNode;
  className?: string;
  route: SiteRoute;
  search?: string;
};

export function RouteLink({ children, className, route, search }: RouteLinkProps) {
  const { navigate } = useNavigationLoading();
  const path = routePath(route);
  const href = search ? `${path}?${search}` : path;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const anchor = event.currentTarget;

    if (
      (anchor.target && anchor.target.toLowerCase() !== "_self") ||
      anchor.hasAttribute("download")
    ) {
      return;
    }

    const destination = new URL(anchor.href, window.location.href);

    if (destination.origin !== window.location.origin) {
      return;
    }

    event.preventDefault();
    navigate(`${destination.pathname}${destination.search}${destination.hash}`);
  };

  return (
    <a
      className={className}
      href={href}
      onClick={handleClick}
      suppressHydrationWarning
    >
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
  nextDisabled?: boolean;
  nextSearch?: string;
  previousLabel: string;
  previousRoute: SiteRoute;
  previousSearch?: string;
  showNext?: boolean;
};

export function PageNavigation({
  nextLabel,
  nextRoute,
  nextDisabled = false,
  nextSearch,
  previousLabel,
  previousRoute,
  previousSearch,
  showNext = true,
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
      {!showNext ? null : nextDisabled ? (
        <span className="page-next disabled" aria-disabled="true">
          {nextLabel} <span aria-hidden="true">→</span>
        </span>
      ) : (
        <RouteLink className="page-next" route={nextRoute} search={nextSearch}>
          {nextLabel} <span aria-hidden="true">→</span>
        </RouteLink>
      )}
    </nav>
  );
}
