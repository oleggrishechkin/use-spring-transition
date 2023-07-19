# use-spring-transition

[![NPM version](https://img.shields.io/npm/v/use-spring-transition.svg?style=flat)](https://www.npmjs.com/package/use-spring-transition)
[![Package size](https://img.shields.io/bundlephobia/minzip/use-spring-transition.svg)](https://bundlephobia.com/result?p=use-spring-transition)
![typescript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)
![NPM license](https://img.shields.io/npm/l/use-spring-transition.svg?style=flat)
[![NPM total downloads](https://img.shields.io/npm/dt/use-spring-transition.svg?style=flat)](https://npmcharts.com/compare/use-spring-transition?minimal=true)
[![NPM monthly downloads](https://img.shields.io/npm/dm/use-spring-transition.svg?style=flat)](https://npmcharts.com/compare/use-spring-transition?minimal=true)

Utilize `react-transition-group` functionality into the hook with spring animation support

## Usage

[Demo](https://codesandbox.io/s/use-spring-transition-hfkzvv)

<details>
<summary>Show menu</summary>

```typescript jsx
// Menu.tsx
import cx from 'clsx';
import { useSpringTransition } from 'use-spring-transition';
import styles from './Menu.module.css';

const Menu = () => {
  const [opened, setOpened] = useState(false);
  const transition = useSpringTransition(
    opened,
    { mass: 1, stiffness: 80, damping: 20 },
    {
      from: 0,
      to: 500,
    },
  );

  if (transition.stage === 'closed') {
    return null;
  }

  return (
    <div
      className={styles.menu}
      style={{ height: transition.springValue }}
    >
      Menu
    </div>
  );
};
```

```css
/* Menu.module.css */
.menu {
  width: 500px;
}
```

</details>

<details>
<summary>Switch image</summary>

```typescript jsx
// Viewer.tsx
import cx from 'clsx';
import { useSpringTransition } from 'use-spring-transition';
import styles from './Viewer.module.css';

const Viewer = ({
  images,
}: {
  images: {
    id: string;
    url: sring;
    alt: string;
  }[];
}) => {
  const [currentIndex, setCurrentIndex] =
    useState(0);
  const transitions = useSpringTransition(
    images[currentIndex],
    { mass: 1, stiffness: 180, damping: 30 },
    { from: 100, to: { open: 0, close: -100 } },
  );

  return (
    <div className={styles.viewer}>
      {transitions.map(
        (transition) =>
          transition.value && (
            <img
              className={cx(
                styles.image,
                styles[transition.stage],
              )}
              style={{
                transform: `translate3d(${transition.springValue}px, 0, 0)`,
              }}
              key={transition.value.id}
              src={transition.value.url}
              alt={transition.value.alt}
            />
          ),
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

</details>

## API

### `SpringOptions`

```typescript
interface SpringOptions {
  mass?: number;
  stiffness?: number;
  damping?: number;
  initialVelocity?: number;
  threshold?: number;
}
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
- `threshold` - special property for ending a spring animation when spring value difference on each frame lower than `threshold` 10 times in a row\*.

\*spring animation can generate a small difference on each frame before reach `to` value. For example, we want to animate opacity from 0 to 1. Spring animation can generate 0.991233, 0.992533, 0.993334... in a near minute before reach 1 (or never reach at all). To avoid this long useless animation we can finish animation when spring value is near the `to` value. That's why we use `threshold` property.

---

### `Stage`

```typescript
type Stage =
  // closed -> opened transition started
  | 'open'
  // closed -> opened transition in proccess
  | 'opening'
  // closed -> opened transition ended
  | 'opened'
  // opened -> closed transition started
  | 'close'
  // opened -> closed transition in proccess
  | 'closing'
  // opened -> closed transition ended
  | 'closed';
```

---

### `Values`

```typescript
interface Values {
  from: number;
  to:
    | number
    // you can use different "to" for closed -> opened and opened -> closed transitions
    | {
        open: number;
        close: number;
      };
}
```

Defaults:

```typescript
{ from: 0, to: 1 }
```

---

### `Options`

```typescript
type Options =
  // spring
  | SpringOptions
  // transiton-duration
  | number
  // you can use different animations for closed -> opened and opened -> closed transitions
  | {
      close: SpringOptions | number;
      open: SpringOptions | number;
    };
```

Defaults:

```typescript
{
}
```

---

### `HookOptions`

```typescript
interface HookOptions<T> {
  // item unique key getter (key can be same as you use for "key" prop)
  getKey?: (item: T) => any;
  // keep transitions with "closed" stage (they filtered by default)
  keepClosed?: boolean;
}
```

Defaults:

```typescript
getKey: (item) => item;
keepClosed: false;
```

---

### `Transition`

```typescript
interface Transition<T> {
  value: T;
  stage: Stage;
  // animated value (it can be height or opacity, for example)
  springValue: number;
}
```

---

### `useSpringTransition`

```typescript
// as open/close transition
export function useSpringTransition(
  opened: boolean,
  options?: Options,
  values?: Values,
): Omit<Transition<boolean>, 'value'>;

// as value transition
export function useSpringTransition<T>(
  value: T,
  options?: Options,
  values?: Values,
  hookOptions?: HookOptions<T>,
): Transition<T>[];

// as list transition
export function useSpringTransition<T>(
  value: T[],
  options?: Options,
  values?: Values,
  hookOptions?: HookOptions<T>,
): Transition<T>[];
```
