import { useEffect, useMemo, useRef, useState } from 'react';

import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
import { normalizeSpringValue, SpringOptions } from './spring';
import { springOrTransition } from './springOrTransition';

export const STAGES = {
    OPEN: 'open',
    OPENING: 'opening',
    OPENED: 'opened',
    CLOSE: 'close',
    CLOSING: 'closing',
    CLOSED: 'closed',
} as const;

export type Stage = (typeof STAGES)[keyof typeof STAGES];

export interface Values {
    from: number;
    to: number | { open: number; close: number };
}

export type Options = SpringOptions | number | { close: SpringOptions | number; open: SpringOptions | number };

export interface HookOptions<T> {
    getKey?: (item: T) => any;
    keepClosed?: boolean;
}

export interface Transition<T> {
    value: T;
    stage: Stage;
    springValue: number;
}

interface TransitionInner<T> extends Transition<T> {
    _transitionId: number;
    _prevSpringValue: number | null;
}

const getOpenOptions = (options: Options) =>
    typeof options === 'number' || !('open' in options) ? options : options.open;

const getCloseOptions = (options: Options) =>
    typeof options === 'number' || !('close' in options) ? options : options.close;

const getOpenTo = (values: Values) => (typeof values.to === 'number' ? values.to : values.to.open);

const getCloseTo = (values: Values) => (typeof values.to === 'number' ? values.from : values.to.close);

const defaultGetKey = <T>(item: T) => item;

const useSpringTransitions = <T>(
    value: T[],
    options: Options = {},
    values: Values = { from: 0, to: 1 },
    hookOptions?: HookOptions<T>,
): Transition<T>[] => {
    const getKey = hookOptions?.getKey || defaultGetKey;
    const keepClosed = !!hookOptions?.keepClosed;
    const from = values.from;
    const openTo = getOpenTo(values);
    const closeTo = getCloseTo(values);
    const counterRef = useRef(0);
    const transitionIdRef = useRef(-1);
    const [inst, setState] = useState<{
        transitions: TransitionInner<T>[];
    }>(() => ({
        transitions: value.map((item) => ({
            value: item,
            stage: STAGES.OPENED,
            springValue: openTo,
            _transitionId: transitionIdRef.current,
            _prevSpringValue: null,
        })),
    }));
    const cleanupsMapRef = useRef<Record<string, () => void>>({});

    useMemo(() => {
        const nextTransitionId = counterRef.current++;
        let isTransitionsChanged = false;
        let isNextTransition = false;
        const nextTransitions: TransitionInner<T>[] = [];
        const valueMap = new Map<any, T>();

        for (const item of value) {
            valueMap.set(getKey(item), item);
        }

        for (const transition of inst.transitions) {
            let springValue = transition.springValue;

            switch (transition.stage) {
                case STAGES.OPEN: {
                    springValue = from;

                    break;
                }
                case STAGES.OPENED: {
                    springValue = openTo;

                    break;
                }
                case STAGES.CLOSED: {
                    springValue = closeTo;

                    break;
                }
            }

            const key = getKey(transition.value);
            const isExist = valueMap.has(key);

            if (isExist) {
                const item = valueMap.get(key)!;

                switch (transition.stage) {
                    case STAGES.CLOSE:
                    case STAGES.CLOSING:
                    case STAGES.CLOSED: {
                        isTransitionsChanged = true;
                        isNextTransition = true;
                        nextTransitions.push({
                            ...transition,
                            value: item,
                            stage: STAGES.OPEN,
                            springValue,
                            _transitionId: nextTransitionId,
                            _prevSpringValue: springValue,
                        });

                        continue;
                    }
                    default: {
                        if (transition.value !== item || transition.springValue !== springValue) {
                            isTransitionsChanged = true;
                            nextTransitions.push({
                                ...transition,
                                value: item,
                                springValue,
                            });

                            continue;
                        }
                    }
                }
            } else {
                switch (transition.stage) {
                    case STAGES.OPEN:
                    case STAGES.OPENING:
                    case STAGES.OPENED: {
                        isTransitionsChanged = true;
                        isNextTransition = true;
                        nextTransitions.push({
                            ...transition,
                            stage: STAGES.CLOSE,
                            _transitionId: nextTransitionId,
                            springValue,
                            _prevSpringValue: springValue,
                        });

                        continue;
                    }
                }
            }

            nextTransitions.push(transition);
            valueMap.delete(key);
        }

        if (valueMap.size) {
            for (const [, item] of valueMap) {
                isTransitionsChanged = true;
                isNextTransition = true;
                nextTransitions.push({
                    value: item,
                    stage: STAGES.OPEN,
                    springValue: from,
                    _transitionId: nextTransitionId,
                    _prevSpringValue: null,
                });
            }
        }

        if (isNextTransition) {
            transitionIdRef.current = nextTransitionId;
        }

        if (isTransitionsChanged) {
            inst.transitions = nextTransitions;
        }
    }, [value, getKey, inst, from, openTo, closeTo]);

    const { transitions } = inst;
    const transitionId = transitionIdRef.current;

    useIsomorphicLayoutEffect(() => {
        if (transitionId === -1) {
            return;
        }

        for (const key of [`${transitionId}`, `${transitionId}_open`, `${transitionId}_close`]) {
            if (cleanupsMapRef.current[key]) {
                cleanupsMapRef.current[key]();
            }
        }

        const openOptions = getOpenOptions(options);
        const closeOptions = getCloseOptions(options);
        const transitionsData =
            openOptions === closeOptions
                ? [{ key: `${transitionId}`, options: openOptions, isOpen: true, isClose: true }]
                : [
                      { key: `${transitionId}_open`, options: openOptions, isOpen: true, isClose: false },
                      { key: `${transitionId}_close`, options: closeOptions, isOpen: false, isClose: true },
                  ];

        for (const data of transitionsData) {
            cleanupsMapRef.current[data.key] = springOrTransition({
                options: data.options,
                onFrame: (proportion) => {
                    setState((curr) => {
                        let isChanged = false;
                        const nextTransitions: TransitionInner<T>[] = [];

                        for (const transition of curr.transitions) {
                            if (transition._transitionId === transitionId) {
                                switch (transition.stage) {
                                    case STAGES.OPEN:
                                    case STAGES.OPENING: {
                                        if (!data.isOpen) {
                                            break;
                                        }

                                        isChanged = true;
                                        nextTransitions.push({
                                            ...transition,
                                            stage: STAGES.OPENING,
                                            springValue: normalizeSpringValue(
                                                transition._prevSpringValue ?? from,
                                                openTo,
                                                proportion,
                                            ),
                                        });

                                        continue;
                                    }
                                    case STAGES.CLOSE:
                                    case STAGES.CLOSING: {
                                        if (!data.isClose) {
                                            break;
                                        }

                                        isChanged = true;
                                        nextTransitions.push({
                                            ...transition,
                                            stage: STAGES.CLOSING,
                                            springValue: normalizeSpringValue(
                                                transition._prevSpringValue ?? openTo,
                                                closeTo,
                                                proportion,
                                            ),
                                        });

                                        continue;
                                    }
                                }
                            }

                            nextTransitions.push(transition);
                        }

                        if (isChanged) {
                            return { transitions: nextTransitions };
                        }

                        return curr;
                    });
                },
                onEnd: () => {
                    delete cleanupsMapRef.current[data.key];

                    setState((curr) => {
                        let isChanged = false;
                        const nextTransitions: TransitionInner<T>[] = [];

                        for (const transition of curr.transitions) {
                            if (transition._transitionId === transitionId) {
                                switch (transition.stage) {
                                    case STAGES.OPEN:
                                    case STAGES.OPENING: {
                                        if (!data.isOpen) {
                                            break;
                                        }

                                        isChanged = true;
                                        nextTransitions.push({
                                            ...transition,
                                            stage: STAGES.OPENED,
                                            springValue: openTo,
                                            _prevSpringValue: null,
                                        });

                                        continue;
                                    }
                                    case STAGES.CLOSE:
                                    case STAGES.CLOSING: {
                                        if (!data.isClose) {
                                            break;
                                        }

                                        isChanged = true;

                                        if (keepClosed) {
                                            nextTransitions.push({
                                                ...transition,
                                                stage: STAGES.CLOSED,
                                                springValue: closeTo,
                                                _prevSpringValue: null,
                                            });
                                        }

                                        continue;
                                    }
                                }
                            }

                            nextTransitions.push(transition);
                        }

                        if (isChanged) {
                            return { transitions: nextTransitions };
                        }

                        return curr;
                    });
                },
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transitionId]);
    useEffect(
        () => () => {
            transitionIdRef.current = -1;

            for (const key in cleanupsMapRef.current) {
                if (cleanupsMapRef.current.hasOwnProperty(key)) {
                    cleanupsMapRef.current[key]();
                }
            }

            cleanupsMapRef.current = {};
        },
        [],
    );

    return transitions;
};

export function useSpringTransition(
    opened: boolean,
    options?: Options,
    values?: Values,
): Omit<Transition<boolean>, 'value'>;
export function useSpringTransition<T extends any[]>(
    value: T,
    options?: Options,
    values?: Values,
    hookOptions?: HookOptions<T[number]>,
): Transition<T[number]>[];
export function useSpringTransition<T>(
    value: T,
    options?: Options,
    values?: Values,
    hookOptions?: HookOptions<T>,
): Transition<T>[];
export function useSpringTransition(
    value: any,
    options: Options = {},
    values: Values = { from: 0, to: 1 },
    hookOptions?: HookOptions<any>,
) {
    const valueArray = useMemo(() => (Array.isArray(value) ? value : [value]), [value]);
    const transitions = useSpringTransitions(valueArray, options, values, hookOptions);

    if (typeof value === 'boolean') {
        const transition = transitions.find((transition) => transition.value);

        if (!transition) {
            return { stage: 'closed', springValue: getCloseTo(values) };
        }

        return { stage: transition.stage, springValue: transition.springValue };
    }

    return transitions;
}
