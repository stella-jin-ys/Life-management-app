const interactiveSelector = 'button, input, textarea, select, option, a, label'

function isInteractiveTarget(target) {
  return target instanceof Element && Boolean(target.closest(interactiveSelector))
}

export function dashboardCardProps(onOpenPage, section, label) {
  if (!onOpenPage) return {}

  return {
    role: 'link',
    tabIndex: 0,
    'aria-label': `Open ${label} page`,
    onClick: (event) => {
      if (!isInteractiveTarget(event.target)) onOpenPage(section)
    },
    onKeyDown: (event) => {
      if (event.target !== event.currentTarget) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onOpenPage(section)
      }
    },
  }
}
