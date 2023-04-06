import { useEffect, useMemo, useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
import { SpringOptions, normalizeSpringValue, spring } from './spring';

export type TransitionState = 'open' | 'opening' | 'opened' | 'close' | 'closing' | 'closed';

export type TransitionValues = { from: number; openingTo: number; closingTo: number } | { from: number; to: number };

export type TransitionOptions =
    | SpringOptions
    | number
    | { close: SpringOptions | number; open: SpringOptions | number };

const getOpenTransitionOptions = (options: TransitionOptions) =>
    typeof options === 'number' || !('open' in options) ? options : options.open;

const getCloseTransitionOptions = (options: TransitionOptions) =>
    typeof options === 'number' || !('close' in options) ? options : options.close;

const getOpeningToValue = (values: TransitionValues) => ('to' in values ? values.to : values.openingTo);

const getClosingToValue = (values: TransitionValues) => ('to' in values ? values.from : values.closingTo);

const useSpringTransition = (
    opened: boolean,
    values?: TransitionValues | null,
    options: TransitionOptions = {},
): [TransitionState, number] => {
    const normalizedValues = values || { from: 0, to: 1 };
    const [inst, setState] = useState<{ springValue: number; state: TransitionState }>({
        springValue: opened ? getOpeningToValue(normalizedValues) : normalizedValues.from,
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
                    setState((curr) => ({ ...curr, state: 'opening', springValue: normalizedValues.from }));
                });

                return;
            }
            case 'opening': {
                const openOptions = getOpenTransitionOptions(options);

                cleanupRef.current = spring(
                    (proportion) => {
                        setState((curr) => ({
                            ...curr,
                            springValue: normalizeSpringValue(
                                springValue,
                                getOpeningToValue(normalizedValues),
                                proportion,
                            ),
                        }));
                    },
                    () => {
                        cleanupRef.current = null;
                        setState({ state: 'opened', springValue: getOpeningToValue(normalizedValues) });
                    },
                    openOptions,
                );

                return;
            }
            case 'close': {
                timeoutIdRef.current = setTimeout(() => {
                    timeoutIdRef.current = null;
                    setState((curr) => ({ ...curr, state: 'closing' }));
                });

                return;
            }
            case 'closing': {
                const closeOptions = getCloseTransitionOptions(options);

                cleanupRef.current = spring(
                    (proportion) => {
                        setState((curr) => ({
                            ...curr,
                            springValue: normalizeSpringValue(
                                springValue,
                                getClosingToValue(normalizedValues),
                                proportion,
                            ),
                        }));
                    },
                    () => {
                        cleanupRef.current = null;
                        setState({ state: 'closed', springValue: normalizedValues.from });
                    },
                    closeOptions,
                );

                return;
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

export {
    useSpringTransition,
    getOpenTransitionOptions,
    getCloseTransitionOptions,
    getOpeningToValue,
    getClosingToValue,
};
