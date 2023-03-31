import { useEffect, useMemo, useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

export type TransitionState = 'open' | 'opening' | 'opened' | 'close' | 'closing' | 'closed';

const useTransitionValue = (opened: boolean, duration: number | { open: number; close: number }): TransitionState => {
    const [inst, setState] = useState<{ state: TransitionState }>({
        state: opened ? 'opened' : 'closed',
    });
    const timeoutIdRef = useRef<any>(null);
    const mountedRef = useRef(false);

    useMemo(() => {
        if (!mountedRef.current) {
            mountedRef.current = true;

            return;
        }

        if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
        }

        inst.state = opened ? 'open' : 'close';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened]);

    const { state } = inst;

    useIsomorphicLayoutEffect(() => {
        switch (state) {
            case 'open': {
                timeoutIdRef.current = setTimeout(() => {
                    timeoutIdRef.current = null;
                    setState({ state: 'opening' });
                });

                break;
            }
            case 'opening': {
                timeoutIdRef.current = setTimeout(
                    () => {
                        timeoutIdRef.current = null;
                        setState({ state: 'opened' });
                    },
                    typeof duration === 'number' ? duration : duration.open,
                );

                break;
            }
            case 'close': {
                timeoutIdRef.current = setTimeout(() => {
                    timeoutIdRef.current = null;
                    setState({ state: 'closing' });
                });

                break;
            }
            case 'closing': {
                timeoutIdRef.current = setTimeout(
                    () => {
                        timeoutIdRef.current = null;
                        setState({ state: 'closed' });
                    },
                    typeof duration === 'number' ? duration : duration.close,
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
        },
        [],
    );

    return state;
};

export { useTransitionValue };
