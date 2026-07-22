export function PageHeader({ badge, title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        {badge && <p className="eyebrow">{badge}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  )
}
