import { useCallback, useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
import { SpringOptions, normalizeSpringValue, spring } from './spring';
import { useUpdateOnRender } from './useUpdateOnRender';

export type Stage = 'open' | 'opening' | 'opened' | 'close' | 'closing' | 'closed';

export type Values = { from: number; to: number | { open: number; close: number } };

export type Options = SpringOptions | number | { close: SpringOptions | number; open: SpringOptions | number };

export const getOpenOptions = (options: Options) =>
    typeof options === 'number' || !('open' in options) ? options : options.open;

export const getCloseOptions = (options: Options) =>
    typeof options === 'number' || !('close' in options) ? options : options.close;

export const getOpenTo = (values: Values) => (typeof values.to === 'number' ? values.to : values.to.open);

export const getCloseTo = (values: Values) => (typeof values.to === 'number' ? values.from : values.to.close);

export const useSpringTransition = (
    opened: boolean,
    options: Options = {},
    values: Values = { from: 0, to: 1 },
): { stage: Stage; springValue: number } => {
    const [inst, setState] = useState<{ stage: Stage; springValue: number }>({
        stage: opened ? 'opened' : 'closed',
        springValue: opened ? getOpenTo(values) : values.from,
    });
    const timeoutIdRef = useRef<any>(null);
    const cleanupRef = useRef<(() => void) | null>(null);
    const cleanup = useCallback(() => {
        if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
        }

        if (cleanupRef.current) {
            cleanupRef.current();
        }
    }, []);

    useUpdateOnRender(() => {
        cleanup();
        inst.stage = opened ? 'open' : 'close';

        if (opened) {
            inst.springValue = values.from;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened]);

    const { springValue, stage } = inst;

    useIsomorphicLayoutEffect(() => {
        switch (stage) {
            case 'open': {
                timeoutIdRef.current = setTimeout(() => {
                    timeoutIdRef.current = null;
                    setState((curr) => ({ stage: 'opening', springValue: curr.springValue }));
                });

                break;
            }
            case 'opening': {
                cleanupRef.current = spring({
                    options: getOpenOptions(options),
                    onFrame: (proportion) => {
                        setState(() => ({
                            stage: 'opening',
                            springValue: normalizeSpringValue(springValue, getOpenTo(values), proportion),
                        }));
                    },
                    onEnd: () => {
                        cleanupRef.current = null;
                        setState({ stage: 'opened', springValue: getOpenTo(values) });
                    },
                });

                break;
            }
            case 'close': {
                timeoutIdRef.current = setTimeout(() => {
                    timeoutIdRef.current = null;
                    setState((curr) => ({ stage: 'closing', springValue: curr.springValue }));
                });

                break;
            }
            case 'closing': {
                cleanupRef.current = spring({
                    options: getCloseOptions(options),
                    onFrame: (proportion) => {
                        setState((curr) => ({
                            ...curr,
                            springValue: normalizeSpringValue(springValue, getCloseTo(values), proportion),
                        }));
                    },
                    onEnd: () => {
                        cleanupRef.current = null;
                        setState({ stage: 'closed', springValue: getCloseTo(values) });
                    },
                });

                break;
            }
        }

        return cleanup;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage]);

    return { stage, springValue };
};
