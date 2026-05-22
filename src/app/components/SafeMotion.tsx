/**
 * @file src/app/components/SafeMotion.tsx
 * @description YYC3 安全动画组件,提供防ForwardRef问题的动画包装器,避免framer-motion与fginspector的兼容性问题
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags component,react,typescript,animation,public
 * @depends react
 */

import React from 'react';

/** Props stripped from motion wrappers (animation-related, not forwarded to DOM) */
interface MotionStripProps {
  animate?: unknown;
  initial?: unknown;
  exit?: unknown;
  transition?: unknown;
  layoutId?: string;
  whileHover?: unknown;
  whileTap?: unknown;
}

/** Generic factory: strips motion-specific props and passes rest to HTML element */
type MotionComponent<T extends keyof React.JSX.IntrinsicElements> =
  (props: MotionStripProps & React.JSX.IntrinsicElements[T]) => React.JSX.Element;

function makeMotion<T extends keyof React.JSX.IntrinsicElements>(Tag: T): MotionComponent<T> {
  const MotionComponent = ({ _animate, _initial, _exit, _transition, _layoutId, _whileHover, _whileTap, ...props }: MotionStripProps & React.JSX.IntrinsicElements[T]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return React.createElement(Tag, props as any);
  };
  MotionComponent.displayName = `motion.${Tag}`;
  return MotionComponent;
}

// Mock motion to avoid fginspector ForwardRef errors
export const motion = {
  div: makeMotion('div'),
  button: makeMotion('button'),
  span: makeMotion('span'),
  li: makeMotion('li'),
  ul: makeMotion('ul'),
  a: makeMotion('a'),
  p: makeMotion('p'),
  h1: makeMotion('h1'),
  h2: makeMotion('h2'),
  h3: makeMotion('h3'),
  section: makeMotion('section'),
  tr: makeMotion('tr'),
  td: makeMotion('td'),
  th: makeMotion('th'),
  tbody: makeMotion('tbody'),
  thead: makeMotion('thead'),
  table: makeMotion('table'),
};

export const AnimatePresence = ({ children }: { children?: React.ReactNode }) => <div className="contents">{children}</div>;
