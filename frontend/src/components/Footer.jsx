export default function Footer({ counts }) {
  return <footer className="py-1 text-center text-xs text-muted-foreground">
    {counts.total ? counts.DONE + "/" + counts.total + " công việc đã hoàn thành trong khoảng thời gian đang xem." : "Mỗi công việc hoàn thành là một bước tiến."}
  </footer>;
}
