import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

export function NotificationsDropdown({ sessionToken }: { sessionToken: string }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const items = useQuery(api.notifications.listForUser, { sessionToken, limit: 30 })
  const markRead = useMutation(api.notifications.markRead)
  const markAllRead = useMutation(api.notifications.markAllRead)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const unread = (items ?? []).filter((n) => !n.read).length

  const onOpen = useCallback(() => {
    setOpen((v) => !v)
  }, [])

  const handleMarkAll = useCallback(() => {
    void markAllRead({ sessionToken })
  }, [markAllRead, sessionToken])

  const handleClickItem = useCallback(
    (id: Id<'notifications'>) => {
      void markRead({ sessionToken, notificationId: id })
    },
    [markRead, sessionToken],
  )

  return (
    <div className="cc-notify" ref={rootRef}>
      <button
        type="button"
        className="cc-icon-btn cc-icon-btn--notify"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={onOpen}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="cc-notify__badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="cc-notify__panel" role="dialog" aria-label="Notifications">
          <div className="cc-notify__head">
            <span className="cc-notify__title">Notifications</span>
            {unread > 0 && (
              <button type="button" className="cc-notify__markall" onClick={handleMarkAll}>
                Mark all read
              </button>
            )}
          </div>
          <ul className="cc-notify__list">
            {!items || items.length === 0 ? (
              <li className="cc-notify__empty">No notifications yet.</li>
            ) : (
              items.map((n) => (
                <li key={n._id}>
                  <button
                    type="button"
                    className={`cc-notify__item${n.read ? '' : ' cc-notify__item--unread'}`}
                    onClick={() => handleClickItem(n._id as Id<'notifications'>)}
                  >
                    <span className="cc-notify__item-title">{n.title}</span>
                    <span className="cc-notify__item-body">{n.body}</span>
                    <span className="cc-notify__item-time">
                      {new Date(n.createdAt).toLocaleString(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
