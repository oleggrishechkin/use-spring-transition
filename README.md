# use-spring-transition

[![NPM version](https://img.shields.io/npm/v/use-spring-transition.svg?style=flat)](https://www.npmjs.com/package/use-spring-transition)
[![Package size](https://img.shields.io/bundlephobia/minzip/use-spring-transition.svg)](https://bundlephobia.com/result?p=use-spring-transition)
![typescript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)
![NPM license](https://img.shields.io/npm/l/use-spring-transition.svg?style=flat)
[![NPM total downloads](https://img.shields.io/npm/dt/use-spring-transition.svg?style=flat)](https://npmcharts.com/compare/use-spring-transition?minimal=true)
[![NPM monthly downloads](https://img.shields.io/npm/dm/use-spring-transition.svg?style=flat)](https://npmcharts.com/compare/use-spring-transition?minimal=true)

Collection of basic hooks to perform css transitions and spring animation in React

At this moment library exports 4 hooks:

- `useTransitionValue` - a hook for simple open/close transition (same as `Transition`/`CSSTransition` components from `react-transition-group`)
- `useTransitionValues` - a hook for value transition (same as `TransitionGroup` component from `react-transition-group`)
- `useSpringTranstiionValue` - same as `useTransitionValue` but use spring animation instead of timers
- `useSpringTranstiionValues` - same as `useTransitionValues` but use spring animation instead of timers

[Demo](https://codesandbox.io/s/use-spring-transition-hfkzvv)

## Basics

`use-spring-transition` use same state model as `react-transition-group` - `open`, `opening`, `opened`, `close`, `closing`, `closed`.

- `open` - when open transition stat. At this moment you want to set your element initial style before css transition applied.
- `opening` - when transition in process. At this moment you want to set your element target style.
- `opened` - when transition is end. At this moment you want to set your element opened styles.
- `close` - same as `open` but for close transition.
- `closing` - same as `opening` but for close transition.
- `closed` - same as `opened` but for close transition. At this moment you want to unmount/hide your element.

Looks pretty similar with `react-transition-group`, but with different naming (`enter` -> `open`, `enter-active` -> `opening`, `enter-done` -> `opened`). But instead of `react-transition-group` states in `use-spring-transition` don't combine like `enter enter-active` 

Value transition has much more difference with `TransitionGroup`, mostly it looks like [useTransition](https://www.react-spring.dev/docs/components/use-transition) hook from `react-spring`

# Usage

## `useTransitionValue`

Show menu from opacity (fadeIn/fadeOut):

```typescript jsx
// Menu.tsx
import cx from 'clsx';
import { useTransitionValue } from 'use-spring-transition';
import styles from './Menu.module.css';

const Menu = () => {
    const [opened, setOpened] = useState(false);
    const transitionState = useTransitionValue(opened, 500);
    
    if (transitionState === 'closed') {
        return null;
    }
    
    return <div className={cx(styles.menu, styles[transitionState])}>Menu</div>;
};
```

```css
/* Menu.module.css */
.menu {
    height: 500px;
    width: 500px;
    transition: opacity 500ms ease-in-out;
}

.menu.closing,
.menu.open {
    opacity: 0
}
```

## `useTransitionValues`

Switch image with translate (slideIn/slideOut):

```typescript jsx
// Viewer.tsx
import cx from 'clsx';
import { useTransitionValues } from 'use-spring-transition';
import styles from './Viewer.module.css';

const Viewer = ({ images }: { images: { id: string; url: sring; alt: string }[] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const transitions = useTransitionValues(images[currentIndex], 500);
    
    return (
        <div className={styles.viewer}>
            {transitions.map((transition) => 
                transition.value && 
                    <img
                        className={cx(styles.image, styles[transition.state])}
                        key={transition.value.id}
                        src={transition.value.url}
                        alt={transition.value.alt}
                    />
            )}
        </div>
    );
};
```

```css
/* Viewer.module.css */
.viewer {
    height: 100%;
    width: 100%;
    position: relative;
}

.image {
    height: 100%;
    width: 100%;
    transition: transform 500ms ease-in-out;
}

.image.close,
.image.closing {
    position: absolute;
    top: 0;
    left: 0;
}

.image.closing {
    transform: translate3d(-100%, 0, 0);
}

.image.open {
    transform: translate3d(100%, 0, 0);
}
```

## `useSpringTransitionValue`

Show menu with height spring animation:

```typescript jsx
// Menu.tsx
import cx from 'clsx';
import { useSpringTransitionValue } from 'use-spring-transition';
import styles from './Menu.module.css';

const Menu = () => {
    const [opened, setOpened] = useState(false);
    const [transitionState, height] = useSpringTransitionValue(opened, { from: 0, to: 500 });
    
    if (transitionState === 'closed') {
        return null;
    }
    
    return <div className={styles.menu} style={{ height }}>Menu</div>;
};
```

```css
/* Menu.module.css */
.menu {
    width: 500px;
}
```

## `useSpringTransitionValues`

Switch image with spring translate (slideIn/slideOut):

```typescript jsx
// Viewer.tsx
import cx from 'clsx';
import { useSpringTransitionValues } from 'use-spring-transition';
import styles from './Viewer.module.css';

const Viewer = ({ images }: { images: { id: string; url: sring; alt: string }[] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const transitions = useSpringTransitionValues(images[currentIndex], { from: 100, openingTo: 0, closingTo: -100 });
    
    return (
        <div className={styles.viewer}>
            {transitions.map((transition) => 
                transition.value && 
                    <img
                        className={cx(styles.image, styles[transition.state])}
                        style={{ transform: `translate3d(${transition.springValue}px, 0, 0)` }}
                        key={transition.value.id}
                        src={transition.value.url}
                        alt={transition.value.alt}
                    />
            )}
        </div>
    );
};
```

```css
/* Viewer.module.css */
.viewer {
    height: 100%;
    width: 100%;
    position: relative;
}

.image {
    height: 100%;
    width: 100%;
}

.image.close,
.image.closing {
    position: absolute;
    top: 0;
    left: 0;
}
```

# API

## `SpringOptions`

```typescript
type SpringOptions = {
    mass?: number;
    stiffness?: number;
    damping?: number;
    initialVelocity?: number;
    threshold?: number;
};
```

Defaults: 

```typescript
mass: 1;
stiffness: 100;
damping: 10;
initialVelocity: 0;
threshold: 0.01;
```

Description:

- `mass, stiffness, damping, initialVelocity` - spring animation configuration
- `threshold` - special property for ending a spring animation when spring value difference on each frame lower than `threshold` 10 times in a row*.

*spring animation can generate a small difference on each frame before reach `to` value. For example, we want to animate opacity from 0 to 1. Spring animation can generate 0.991233, 0.992533, 0.993334... in a near minute before reach 1 (or never reach at all). To avoid this long useless animation we can finish animation when spring value is near the `to` value. That's why we use `threshold` property.  

## `TransitionState`

```typescript
type TransitionState = 'open' | 'opening' | 'opened' | 'close' | 'closing' | 'closed';
```

## `useTransitionValue`

```typescript
const useTransitionValue = (opened: boolean, duration: number | { open: number; close: number }): TransitionState
```

Params:
- `opened: boolean` - trigger for transition
- `duration: number | { open: number; close: number }` - transition duration; should be equal to css `transition-duration` property; you can specify different duration for open and close transitions

Returns:
- `state: TransitionState` - state of transition;

## `useTransitionValues`

```typescript
const useTransitionValues = <T>(value: T, duration: number): { value: T; state: TransitionState }[]
```

Params:
- `opened: boolean` - trigger for transition
- `duration: number` - transition duration; should be equal to css `transition-duration` property

Returns:
- `transitions: { value: T; state: TransitionState }[]` - array of transitions (values); you should map this array in your component.

## `useSpringTransitionValue`

```typescript
const useSpringTransitionValue = (
    opened: boolean,
    { from, to }: { from: number; to: number },
    options?: SpringOptions,
): [TransitionState, number]
```

Params:
- `opened: boolean` - trigger for transition
- `{ from, to }: { from: number; to: number }` - values for spring animation
- `options: SpringOptions` - configuration for spring animation

Returns:
- `[state, springValue]: [TransitionState, number]` - state of transition and spring value; you should use `springValue` as animated style property

## `useSpringTransitionValues`

```typescript
const useSpringTransitionValues = <T>(
    value: T,
    { from, openingTo, closingTo }: { from: number; openingTo: number; closingTo: number },
    options?: SpringOptions,
): { value: T; springValue: number; state: TransitionState }[]
```

Params:
- `opened: boolean` - trigger for transition
- `{ from, openingTo, closingTo }: { from: number; openingTo: number; closingTo: number }` - values for spring animation
- `options: SpringOptions` - configuration for spring animation

Returns:
- `transitions: { value: T; springValue: number; state: TransitionState }[]` - array of transitions (values); you should map this array in your component; you should use `springValue` as animated style property

