import { useEffect, useRef, useState } from 'react';
import { Stage, Options, Values, getOpenOptions, getCloseOptions, getOpenTo, getCloseTo } from './useSpringTransition';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
import { normalizeSpringValue, spring, SpringOptions } from './spring';
import { getUniqueId } from './getUniqueId';
import { useUpdateOnRender } from './useUpdateOnRender';

export const useSpringTransitions = <T>(
    value: T,
    options: Options = {},
    values: Values = { from: 0, to: 1 },
): { value: T; stage: Stage; springValue: number }[] => {
    const transitionIdRef = useRef<number | null>(null);
    const [inst, setState] = useState({
        transitions: [
            {
                value,
                stage: 'opened' as Stage,
                springValue: getOpenTo(values),
                _transitionId: transitionIdRef.current,
            },
        ],
    });
    const timeoutMapRef = useRef<Record<string, any>>({});
    const openCleanupsMapRef = useRef<Record<string, () => void>>({});
    const closeCleanupsMapRef = useRef<Record<string, () => void>>({});

    useUpdateOnRender(() => {
        let isNew = true;
        let isChanged = false;

        transitionIdRef.current = getUniqueId();

        const nextTransitions = inst.transitions.map((transition) => {
            if (transition.value === value) {
                isNew = false;

                if (['close', 'closing', 'closed'].includes(transition.stage)) {
                    isChanged = true;
                    transition._transitionId = transitionIdRef.current;

                    return { ...transition, stage: 'open' as Stage };
                }

                return transition;
            }

            if (['open', 'opening', 'opened'].includes(transition.stage)) {
                isChanged = true;
                transition._transitionId = transitionIdRef.current;

                return { ...transition, stage: 'close' as Stage };
            }

            return transition;
        });

        if (isNew) {
            isChanged = true;
            nextTransitions.push({
                value,
                stage: 'open',
                springValue: values.from,
                _transitionId: transitionIdRef.current,
            });
        }

        if (isChanged) {
            inst.transitions = nextTransitions;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const { transitions } = inst;

    useIsomorphicLayoutEffect(() => {
        const transitionId = transitionIdRef.current;

        if (!transitionId) {
            return;
        }

        const isOpenClosePending =
            !timeoutMapRef.current[transitionId] &&
            transitions.some(
                (transition) =>
                    ['open', 'close'].includes(transition.stage) && transition._transitionId === transitionId,
            );

        if (isOpenClosePending) {
            timeoutMapRef.current[transitionId] = setTimeout(() => {
                delete timeoutMapRef.current[transitionId];
                setState((curr) => {
                    let isChanged = false;
                    const nextTransitions = curr.transitions.map((transition) => {
                        if (['open', 'close'].includes(transition.stage) && transition._transitionId === transitionId) {
                            isChanged = true;

                            return {
                                ...transition,
                                stage: (transition.stage === 'open' ? 'opening' : 'closing') as Stage,
                            };
                        }

                        return transition;
                    });

                    if (isChanged) {
                        return { transitions: nextTransitions };
                    }

                    return curr;
                });
            });
        }

        const isOpeningPending =
            !openCleanupsMapRef.current[transitionId] &&
            transitions.some(
                (transition) => transition.stage === 'opening' && transition._transitionId === transitionId,
            );
        const isClosingPending =
            !closeCleanupsMapRef.current[transitionId] &&
            transitions.some(
                (transition) => transition.stage === 'closing' && transition._transitionId === transitionId,
            );

        if (!isOpeningPending && !isClosingPending) {
            return;
        }

        const openClose = (
            { open, close }: { open: boolean; close: boolean },
            openCloseOptions: SpringOptions | number,
        ) => {
            const springValuesByValueMap = transitions.reduce((res, transition) => {
                res.set(transition.value, transition.springValue);

                return res;
            }, new Map() as Map<T, number>);

            const cleanup = spring({
                options: openCloseOptions,
                onFrame: (proportion) => {
                    setState((curr) => {
                        let isChanged = false;
                        const nextTransitions = curr.transitions.map((transition) => {
                            if (open && transition.stage === 'opening' && transition._transitionId === transitionId) {
                                isChanged = true;

                                const springValue = springValuesByValueMap.get(transition.value);

                                return {
                                    ...transition,
                                    springValue: normalizeSpringValue(
                                        typeof springValue === 'undefined' ? values.from : springValue,
                                        getOpenTo(values),
                                        proportion,
                                    ),
                                };
                            }

                            if (close && transition.stage === 'closing' && transition._transitionId === transitionId) {
                                isChanged = true;

                                const springValue = springValuesByValueMap.get(transition.value);

                                return {
                                    ...transition,
                                    springValue: normalizeSpringValue(
                                        typeof springValue === 'undefined' ? getOpenTo(values) : springValue,
                                        getCloseTo(values),
                                        proportion,
                                    ),
                                };
                            }

                            return transition;
                        });

                        if (isChanged) {
                            return { transitions: nextTransitions };
                        }

                        return curr;
                    });
                },
                onEnd: () => {
                    if (open) {
                        delete openCleanupsMapRef.current[transitionId];
                    }

                    if (close) {
                        delete closeCleanupsMapRef.current[transitionId];
                    }

                    setState((curr) => {
                        let isChanged = false;
                        const nextTransitions = curr.transitions
                            .filter((transition) => {
                                if (
                                    close &&
                                    transition.stage === 'closing' &&
                                    transition._transitionId === transitionId
                                ) {
                                    isChanged = true;

                                    return false;
                                }

                                return true;
                            })
                            .map((transition) => {
                                if (
                                    open &&
                                    transition.stage === 'opening' &&
                                    transition._transitionId === transitionId
                                ) {
                                    isChanged = true;

                                    return {
                                        ...transition,
                                        stage: 'opened' as Stage,
                                        springValue: getOpenTo(values),
                                    };
                                }

                                return transition;
                            });

                        if (isChanged) {
                            return { transitions: nextTransitions };
                        }

                        return curr;
                    });
                },
            });

            if (open) {
                openCleanupsMapRef.current[transitionId] = cleanup;
            }

            if (close) {
                closeCleanupsMapRef.current[transitionId] = cleanup;
            }
        };

        const openOptions = getOpenOptions(options);
        const closeOptions = getCloseOptions(options);

        if (openOptions === closeOptions) {
            openClose({ open: isOpeningPending, close: isClosingPending }, openOptions);

            return;
        }

        if (isOpeningPending) {
            openClose({ open: isOpeningPending, close: false }, openOptions);
        }

        if (isClosingPending) {
            openClose({ open: false, close: isClosingPending }, closeOptions);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transitions]);
    useEffect(
        () => () => {
            transitionIdRef.current = null;
            Object.keys(timeoutMapRef.current).forEach((key) => {
                clearTimeout(timeoutMapRef.current[key]);
            });
            timeoutMapRef.current = {};
            Object.keys(openCleanupsMapRef.current).forEach((key) => {
                openCleanupsMapRef.current[key]();
            });
            openCleanupsMapRef.current = {};
            Object.keys(closeCleanupsMapRef.current).forEach((key) => {
                closeCleanupsMapRef.current[key]();
            });
            closeCleanupsMapRef.current = {};
        },
        [],
    );

    return transitions;
};
