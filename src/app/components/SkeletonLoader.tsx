/**
 * @file src/app/components/SkeletonLoader.tsx
 * @description YYC3 骨架屏加载器组件,为懒加载模块提供Suspense回退,纯函数组件无forwardRef
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags component,react,typescript,skeleton,public
 * @depends react
 */

/**
 * YYC-QATS Skeleton Loader
 * ─────────────────────────
 * Phase 13: Suspense fallback for lazy-loaded modules.
 * Pure function component — no forwardRef, no radix-ui.
 */

/** Pulsing bar placeholder */
function SkeletonBar({ width = '100%', height = '1rem', className = '' }: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded bg-[#233554]/60 ${className}`}
      style={{ width, height }}
    />
  );
}

/** Card-shaped skeleton block */
function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-lg bg-[#112240] border border-[#233554] p-4 space-y-3 ${className}`}>
      <SkeletonBar width="40%" height="0.875rem" />
      <SkeletonBar width="70%" height="0.75rem" />
      <SkeletonBar width="55%" height="0.75rem" />
      <div className="flex gap-2 pt-2">
        <SkeletonBar width="4rem" height="1.75rem" />
        <SkeletonBar width="4rem" height="1.75rem" />
      </div>
    </div>
  );
}

/** Full module skeleton used as Suspense fallback */
export function ModuleSkeleton({ moduleName = '模块' }: { moduleName?: string }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBar width="8rem" height="0.625rem" />
          <SkeletonBar width="14rem" height="1.25rem" />
        </div>
        <div className="flex gap-2">
          <SkeletonBar width="5rem" height="2rem" />
          <SkeletonBar width="5rem" height="2rem" />
        </div>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-[#112240] border border-[#233554] p-3 space-y-2">
            <SkeletonBar width="50%" height="0.625rem" />
            <SkeletonBar width="70%" height="1.25rem" />
            <SkeletonBar width="40%" height="0.5rem" />
          </div>
        ))}
      </div>

      {/* Main content cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg bg-[#112240] border border-[#233554] p-4 space-y-2">
        <SkeletonBar width="30%" height="0.875rem" />
        <div className="space-y-1.5 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBar key={i} width="100%" height="2rem" />
          ))}
        </div>
      </div>

      {/* Loading text */}
      <div className="text-center py-4">
        <p className="text-[#4A5568] text-xs">
          {moduleName} 加载中...
        </p>
      </div>
    </div>
  );
}

/** Compact inline skeleton for widgets */
export function WidgetSkeleton() {
  return (
    <div className="rounded-lg bg-[#112240] border border-[#233554] p-3 space-y-2 animate-pulse">
      <SkeletonBar width="60%" height="0.75rem" />
      <SkeletonBar width="80%" height="0.625rem" />
    </div>
  );
}

/** Expose for testing */
export { SkeletonBar, SkeletonCard };
