import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog'
import { useByteFormat } from '@renderer/hooks/use-byte-format'
import { transport } from '@renderer/lib/transport'
import { Queries } from '@shared/protocol/queries'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface ContributionDay {
  date: string
  bytes: string
  tasks: Array<{ name: string; bytes: string }>
}

interface ContributionSnapshot {
  totalBytes: string
  days: ContributionDay[]
}

export function Ed2kContributionDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t, i18n } = useTranslation()
  const { formatBytes } = useByteFormat()
  const [data, setData] = useState<ContributionSnapshot | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setFailed(false)
    transport
      .invoke(Queries.GetEd2kContribution)
      .then((result) => {
        if (!cancelled) setData(result as ContributionSnapshot)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ED2K 贡献</DialogTitle>
          <DialogDescription>
            你通过这个客户端累计回馈给 eD2k 网络的流量。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
            <div className="text-xs text-muted-foreground">累计贡献</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {data ? formatBytes(data.totalBytes) : '—'}
            </div>
          </div>
          {failed ? (
            <p className="text-sm text-muted-foreground">
              {t('panel.dashboard.transfer.unavailable')}
            </p>
          ) : data && data.days.length > 0 ? (
            <div className="max-h-72 space-y-3 overflow-y-auto pe-1">
              {data.days.map((day) => (
                <div key={day.date} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">
                      {new Intl.DateTimeFormat(i18n.language, {
                        dateStyle: 'medium',
                      }).format(new Date(`${day.date}T12:00:00`))}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatBytes(day.bytes)}
                    </span>
                  </div>
                  {day.tasks.slice(0, 3).map((task) => (
                    <div
                      key={task.name}
                      className="flex items-baseline justify-between gap-2 ps-3 text-xs text-muted-foreground"
                    >
                      <span className="truncate">{task.name}</span>
                      <span className="shrink-0 tabular-nums">
                        {formatBytes(task.bytes)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              还没有贡献记录。保持分享开关开启，下载完成后会自动累计。
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
