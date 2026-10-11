import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

const TaskListPagination = ({
  handleNext,
  handlePrev,
  handlePageChange,
  page,
  totalPages,
  disabled = false,
}) => {
  const generatePages = () => {
    // If total pages is small, show all pages
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // If total pages is large (> 7), execute complex logic
    // Case 1: Current page is near the start
    if (page <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    // Case 2: Current page is near the end
    if (page >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    // Case 3: Current page is in the middle
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  const pagesToShow = generatePages();

  return (
    <div className="mt-4 flex min-w-0 justify-center">
      <Pagination>
        <PaginationContent>
          {/* Trước */}
          <PaginationItem>
            <PaginationPrevious
              asButton
              disabled={disabled || page === 1}
              onClick={page === 1 ? undefined : handlePrev}
              className={cn(
                "size-8 cursor-pointer p-0 sm:h-9 sm:w-auto sm:px-2.5",
                page === 1 && "pointer-events-none opacity-50"
              )}
            />
          </PaginationItem>

          <PaginationItem className="px-2 text-xs tabular-nums sm:hidden">Trang {page}/{totalPages}</PaginationItem>
          {pagesToShow.map((p, index) => (
            <PaginationItem key={index} className="hidden sm:block">
              {p === "..." ? (
                <PaginationEllipsis className="size-8 sm:size-9" />
              ) : (
                <PaginationLink
                  asButton
                  disabled={disabled}
                  isActive={p === page}
                  onClick={() => {
                    if (p !== page) handlePageChange(p);
                  }}
                  className="size-8 cursor-pointer sm:size-9"
                >
                  {p}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          {/* Sau */}
          <PaginationItem>
            <PaginationNext
              asButton
              disabled={disabled || page === totalPages}
              onClick={page === totalPages ? undefined : handleNext}
              className={cn(
                "size-8 cursor-pointer p-0 sm:h-9 sm:w-auto sm:px-2.5",
                page === totalPages && "pointer-events-none opacity-50"
              )}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export default TaskListPagination;
