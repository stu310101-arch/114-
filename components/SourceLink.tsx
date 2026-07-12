type SourceLinkProps = {
  href: string;
  compact?: boolean;
};

export function SourceLink({ href, compact = false }: SourceLinkProps) {
  return (
    <a
      className={compact ? "source-link compact" : "source-link"}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      官方原表 <span aria-hidden="true">↗</span>
    </a>
  );
}
