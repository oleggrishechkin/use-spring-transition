import { useEffect, useMemo, useRef, useState } from 'react';
import {
    TransitionState,
    TransitionOptions,
    TransitionValues,
    getOpenTransitionOptions,
    getCloseTransitionOptions,
    getOpeningToValue,
    getClosingToValue,
} from './useSpringTransition';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
import { normalizeSpringValue, spring } from './spring';
import { getUniqueId } from './getUniqueId';

const useSpringTransitions = <T>(
    value: T,
    values?: TransitionValues | null,
    options: TransitionOptions = {},
): { value: T; springValue: number; state: TransitionState }[] => {
    const normalizedValues = values || { from: 0, to: 1 };
    const transitionIdRef = useRef('');
    const [inst, setState] = useState({
        transitions: [
            {
                value,
                springValue: getOpeningToValue(normalizedValues),
                state: 'opened' as TransitionState,
                _transitionId: transitionIdRef.current,
            },
        ],
    });
    const mountedRef = useRef(false);
    const timeoutMapRef = useRef<Record<string, any>>({});
    const openCleanupsMapRef = useRef<Record<string, () => void>>({});
    const closeCleanupsMapRef = useRef<Record<string, () => void>>({});

    useMemo(() => {
        if (!mountedRef.current) {
            mountedRef.current = true;

            return;
        }

        let isNew = true;
        let isChanged = false;

        transitionIdRef.current = getUniqueId();

        const nextTransitions = inst.transitions.map((transition) => {
            if (transition.value === value) {
                isNew = false;

                if (['close', 'closing', 'closed'].includes(transition.state)) {
                    isChanged = true;
                    transition._transitionId = transitionIdRef.current;

                    return { ...transition, state: 'open' as TransitionState };
                }

                return transition;
            }

            if (['open', 'opening', 'opened'].includes(transition.state)) {
                isChanged = true;
                transition._transitionId = transitionIdRef.current;

                return { ...transition, state: 'close' as TransitionState };
            }

            return transition;
        });

        if (isNew) {
            isChanged = true;
            nextTransitions.push({
                value,
                springValue: normalizedValues.from,
                state: 'open',
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
                    ['open', 'close'].includes(transition.state) && transition._transitionId === transitionId,
            );

        if (isOpenClosePending) {
            timeoutMapRef.current[transitionId] = setTimeout(() => {
                delete timeoutMapRef.current[transitionId];
                setState((curr) => {
                    let isChanged = false;
                    const nextTransitions = curr.transitions.map((transition) => {
                        if (['open', 'close'].includes(transition.state) && transition._transitionId === transitionId) {
                            isChanged = true;

                            return {
                                ...transition,
                                state: (transition.state === 'open' ? 'opening' : 'closing') as TransitionState,
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
                (transition) => transition.state === 'opening' && transition._transitionId === transitionId,
            );
        const isClosingPending =
            !closeCleanupsMapRef.current[transitionId] &&
            transitions.some(
                (transition) => transition.state === 'closing' && transition._transitionId === transitionId,
            );
        const openOptions = getOpenTransitionOptions(options);
        const closeOptions = getCloseTransitionOptions(options);

        if (isOpeningPending || isClosingPending) {
            const springValuesByValueMap = transitions.reduce((res, transition) => {
                res.set(transition.value, transition.springValue);

                return res;
            }, new Map() as Map<T, number>);

            if (openOptions === closeOptions) {
                const cleanup = spring(
                    (proportion) => {
                        setState((curr) => {
                            let isChanged = false;
                            const nextTransitions = curr.transitions.map((transition) => {
                                if (transition.state === 'opening' && transition._transitionId === transitionId) {
                                    isChanged = true;

                                    const springValue = springValuesByValueMap.get(transition.value);

                                    return {
                                        ...transition,
                                        springValue: normalizeSpringValue(
                                            typeof springValue === 'undefined' ? normalizedValues.from : springValue,
                                            getOpeningToValue(normalizedValues),
                                            proportion,
                                        ),
                                    };
                                }

                                if (transition.state === 'closing' && transition._transitionId === transitionId) {
                                    isChanged = true;

                                    const springValue = springValuesByValueMap.get(transition.value);

                                    return {
                                        ...transition,
                                        springValue: normalizeSpringValue(
                                            typeof springValue === 'undefined'
                                                ? getOpeningToValue(normalizedValues)
                                                : springValue,
                                            getClosingToValue(normalizedValues),
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
                    () => {
                        delete openCleanupsMapRef.current[transitionId];
                        delete closeCleanupsMapRef.current[transitionId];
                        setState((curr) => {
                            let isChanged = false;
                            const nextTransitions = curr.transitions
                                .filter((transition) => {
                                    if (transition.state === 'closing' && transition._transitionId === transitionId) {
                                        isChanged = true;

                                        return false;
                                    }

                                    return true;
                                })
                                .map((transition) => {
                                    if (transition.state === 'opening' && transition._transitionId === transitionId) {
                                        isChanged = true;

                                        return {
                                            ...transition,
                                            springValue: getOpeningToValue(normalizedValues),
                                            state: 'opened' as TransitionState,
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
                    openOptions,
                );

                openCleanupsMapRef.current[transitionId] = cleanup;
                closeCleanupsMapRef.current[transitionId] = cleanup;

                return;
            }

            if (isOpeningPending) {
                openCleanupsMapRef.current[transitionId] = spring(
                    (proportion) => {
                        setState((curr) => {
                            let isChanged = false;
                            const nextTransitions = curr.transitions.map((transition) => {
                                if (transition.state === 'opening' && transition._transitionId === transitionId) {
                                    isChanged = true;

                                    const springValue = springValuesByValueMap.get(transition.value);

                                    return {
                                        ...transition,
                                        springValue: normalizeSpringValue(
                                            typeof springValue === 'undefined' ? normalizedValues.from : springValue,
                                            getOpeningToValue(normalizedValues),
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
                    () => {
                        delete openCleanupsMapRef.current[transitionId];
                        setState((curr) => {
                            let isChanged = false;
                            const nextTransitions = curr.transitions.map((transition) => {
                                if (transition.state === 'opening' && transition._transitionId === transitionId) {
                                    isChanged = true;

                                    return {
                                        ...transition,
                                        springValue: getOpeningToValue(normalizedValues),
                                        state: 'opened' as TransitionState,
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
                    openOptions,
                );
            }

            if (isClosingPending) {
                closeCleanupsMapRef.current[transitionId] = spring(
                    (proportion) => {
                        setState((curr) => {
                            let isChanged = false;
                            const nextTransitions = curr.transitions.map((transition) => {
                                if (transition.state === 'closing' && transition._transitionId === transitionId) {
                                    isChanged = true;

                                    const springValue = springValuesByValueMap.get(transition.value);

                                    return {
                                        ...transition,
                                        springValue: normalizeSpringValue(
                                            typeof springValue === 'undefined'
                                                ? getOpeningToValue(normalizedValues)
                                                : springValue,
                                            getClosingToValue(normalizedValues),
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
                    () => {
                        delete closeCleanupsMapRef.current[transitionId];
                        setState((curr) => {
                            let isChanged = false;
                            const nextTransitions = curr.transitions.filter((transition) => {
                                if (transition.state === 'closing' && transition._transitionId === transitionId) {
                                    isChanged = true;

                                    return false;
                                }

                                return true;
                            });

                            if (isChanged) {
                                return { transitions: nextTransitions };
                            }

                            return curr;
                        });
                    },
                    closeOptions,
                );
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transitions]);
    useEffect(
        () => () => {
            transitionIdRef.current = '';
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

export { useSpringTransitions };
