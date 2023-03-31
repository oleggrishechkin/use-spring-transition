import { useEffect, useMemo, useRef, useState } from 'react';
import { TransitionState } from './useTransitionValue';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
import { SpringOptions, normalizeSpringValue, spring } from './spring';
import { getUniqueId } from './getUniqueId';

const useSpringTransitionValues = <T>(
    value: T,
    { from, openingTo, closingTo }: { from: number; openingTo: number; closingTo: number },
    options?: SpringOptions,
): { value: T; springValue: number; state: TransitionState }[] => {
    const transitionIdRef = useRef('');
    const [inst, setState] = useState({
        transitions: [
            {
                value,
                springValue: openingTo,
                state: 'opened' as TransitionState,
                _transitionId: transitionIdRef.current,
            },
        ],
    });
    const mountedRef = useRef(false);
    const timeoutMapRef = useRef<Record<string, any>>({});
    const cleanupsMapRef = useRef<Record<string, () => void>>({});

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

                if (['close', 'closing'].includes(transition.state)) {
                    isChanged = true;
                    transition._transitionId = transitionIdRef.current;

                    return { ...transition, state: 'open' as TransitionState };
                }

                return transition;
            } else {
                if (['open', 'opening', 'opened'].includes(transition.state)) {
                    isChanged = true;
                    transition._transitionId = transitionIdRef.current;

                    return { ...transition, state: 'close' as TransitionState };
                }

                return transition;
            }
        });

        if (isNew) {
            isChanged = true;
            nextTransitions.push({
                value,
                springValue: from,
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

        if (
            transitions.some(
                (transition) =>
                    ['open', 'close'].includes(transition.state) && transition._transitionId === transitionId,
            ) &&
            !timeoutMapRef.current[transitionId]
        ) {
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
        } else if (
            transitions.some(
                (transition) =>
                    ['opening', 'closing'].includes(transition.state) && transition._transitionId === transitionId,
            ) &&
            !cleanupsMapRef.current[transitionId]
        ) {
            const opening = transitions.find(
                (transition) => transition.state === 'opening' && transition._transitionId === transitionId,
            );
            const closing = transitions.find(
                (transition) => transition.state === 'closing' && transition._transitionId === transitionId,
            );
            const openingSpringValue = opening ? opening.springValue : from;
            const closingSpringValue = closing ? closing.springValue : openingTo;

            cleanupsMapRef.current[transitionId] = spring(
                (proportion) => {
                    setState((curr) => {
                        let isChanged = false;
                        const nextTransitions = curr.transitions.map((transition) => {
                            if (transition.state === 'opening' && transition._transitionId === transitionId) {
                                isChanged = true;

                                return {
                                    ...transition,
                                    springValue: normalizeSpringValue(openingSpringValue, openingTo, proportion),
                                };
                            }

                            if (transition.state === 'closing' && transition._transitionId === transitionId) {
                                isChanged = true;

                                return {
                                    ...transition,
                                    springValue: normalizeSpringValue(closingSpringValue, closingTo, proportion),
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
                    delete cleanupsMapRef.current[transitionId];
                    setState((curr) => {
                        let isChanged = false;
                        const nextTransitions = curr.transitions
                            .filter((transition) => {
                                if (transition.state !== 'closing' || transition._transitionId !== transitionId) {
                                    return true;
                                }

                                isChanged = true;

                                return false;
                            })
                            .map((transition) => {
                                if (transition.state === 'opening' && transition._transitionId === transitionId) {
                                    isChanged = true;

                                    return {
                                        ...transition,
                                        springValue: openingTo,
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
                options,
            );
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
            Object.keys(cleanupsMapRef.current).forEach((key) => {
                cleanupsMapRef.current[key]();
            });
            cleanupsMapRef.current = {};
        },
        [],
    );

    return transitions;
};

export { useSpringTransitionValues };
