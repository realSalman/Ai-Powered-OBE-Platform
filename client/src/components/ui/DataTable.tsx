"use client";

import React from 'react';
import { PaginationMeta } from '@/types/api';

export interface ColumnConfig<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: ColumnConfig<T>[];
  data: T[];
  loading?: boolean;
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  emptyMessage?: string;
  extraActions?: (item: T) => React.ReactNode;
  topActions?: React.ReactNode;
}

export function DataTable<T extends { _id: string }>({
  columns,
  data,
  loading = false,
  meta,
  onPageChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  onEdit,
  onDelete,
  emptyMessage = "No records found.",
  extraActions,
  topActions,
}: DataTableProps<T>) {
  return (
    <div className="space-y-4">
      {/* Search and Top Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {onSearchChange !== undefined && (
          <div className="w-full md:w-80">
            <input
              type="text"
              value={searchQuery || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder.toUpperCase()}
              className="block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
            />
          </div>
        )}
        <div className="flex gap-2 w-full md:w-auto md:ml-auto">
          {topActions}
        </div>
      </div>

      {/* Table Wrapper */}
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto rounded-none">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/55 dark:bg-zinc-900/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-[10px] font-mono font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase select-none"
                >
                  {col.label}
                </th>
              ))}
              {(onEdit || onDelete || extraActions) && (
                <th className="px-4 py-3 text-[10px] font-mono font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Loading Skeleton
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="border-b border-zinc-100 dark:border-zinc-900 last:border-none">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="px-4 py-3.5">
                      <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 animate-pulse w-3/4"></div>
                    </td>
                  ))}
                  {(onEdit || onDelete || extraActions) && (
                    <td className="px-4 py-3.5 text-right">
                      <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 animate-pulse w-1/2 ml-auto"></div>
                    </td>
                  )}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete || extraActions ? 1 : 0)}
                  className="px-4 py-8 text-center text-xs font-mono text-zinc-400 dark:text-zinc-500"
                >
                  {emptyMessage.toUpperCase()}
                </td>
              </tr>
            ) : (
              // Data Rows
              data.map((item) => (
                <tr
                  key={item._id}
                  className="border-b border-zinc-150 dark:border-zinc-800/80 hover:bg-zinc-50/30 dark:hover:bg-zinc-800/20 last:border-none transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-xs text-zinc-800 dark:text-zinc-300 font-mono">
                      {col.render ? col.render(item) : (item as any)[col.key]?.toString() || '-'}
                    </td>
                  ))}
                  {(onEdit || onDelete || extraActions) && (
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      {extraActions && extraActions(item)}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="px-2 py-1 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono uppercase tracking-tight text-zinc-700 dark:text-zinc-300 hover:border-zinc-900 dark:hover:border-zinc-100 cursor-pointer"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item)}
                          className="px-2 py-1 border border-red-200 dark:border-red-950/50 text-[10px] font-mono uppercase tracking-tight text-red-600 dark:text-red-400 hover:border-red-500 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/10"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {meta && onPageChange && meta.totalPages > 1 && (
        <div className="flex justify-between items-center px-1">
          <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase">
            PAGE {meta.page} OF {meta.totalPages} • TOTAL {meta.total} ITEMS
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(meta.page - 1)}
              disabled={!meta.hasPrev || loading}
              className="px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono hover:border-zinc-900 dark:hover:border-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer uppercase"
            >
              Prev
            </button>
            <button
              onClick={() => onPageChange(meta.page + 1)}
              disabled={!meta.hasNext || loading}
              className="px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono hover:border-zinc-900 dark:hover:border-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer uppercase"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
