import { useEffect, useMemo, useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
import { TransitionState } from './useTransitionValue';
import { SpringOptions, normalizeSpringValue, spring } from './spring';

const useSpringTransitionValue = (
    opened: boolean,
    { from, to }: { from: number; to: number },
    options?: SpringOptions,
): [TransitionState, number] => {
    const [inst, setState] = useState<{ springValue: number; state: TransitionState }>({
        springValue: opened ? to : from,
        state: opened ? 'opened' : 'closed',
    });
    const timeoutIdRef = useRef<any>(null);
    const mountedRef = useRef(false);
    const cleanupRef = useRef<(() => void) | null>(null);

    useMemo(() => {
        if (!mountedRef.current) {
            mountedRef.current = true;

            return;
        }

        if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
        }

        if (cleanupRef.current) {
            cleanupRef.current();
        }

        inst.state = opened ? 'open' : 'close';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened]);

    const { springValue, state } = inst;

    useIsomorphicLayoutEffect(() => {
        switch (state) {
            case 'open': {
                timeoutIdRef.current = setTimeout(() => {
                    timeoutIdRef.current = null;
                    setState((curr) => ({ ...curr, state: 'opening' }));
                });

                break;
            }
            case 'opening': {
                cleanupRef.current = spring(
                    (proportion) => {
                        setState((curr) => ({
                            ...curr,
                            springValue: normalizeSpringValue(springValue, to, proportion),
                        }));
                    },
                    () => {
                        cleanupRef.current = null;
                        setState({ state: 'opened', springValue: to });
                    },
                    options,
                );

                break;
            }
            case 'close': {
                timeoutIdRef.current = setTimeout(() => {
                    timeoutIdRef.current = null;
                    setState((curr) => ({ ...curr, state: 'closing' }));
                });

                break;
            }
            case 'closing': {
                cleanupRef.current = spring(
                    (proportion) => {
                        setState((curr) => ({
                            ...curr,
                            springValue: normalizeSpringValue(springValue, from, proportion),
                        }));
                    },
                    () => {
                        cleanupRef.current = null;
                        setState({ state: 'closed', springValue: from });
                    },
                    options,
                );

                break;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state]);
    useEffect(
        () => () => {
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
            }

            if (cleanupRef.current) {
                cleanupRef.current();
            }
        },
        [],
    );

    return [state, springValue];
};

export { useSpringTransitionValue, spring, normalizeSpringValue };
