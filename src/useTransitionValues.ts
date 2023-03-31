import { useEffect, useMemo, useRef, useState } from 'react';
import { TransitionState } from './useTransitionValue';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
import { getUniqueId } from './getUniqueId';

const useTransitionValues = <T>(value: T, duration: number): { value: T; state: TransitionState }[] => {
    const transitionIdRef = useRef('');
    const [inst, setState] = useState({
        transitions: [
            {
                value,
                state: 'opened' as TransitionState,
                _transitionId: transitionIdRef.current,
            },
        ],
    });
    const mountedRef = useRef(false);
    const timeoutMapRef = useRef<Record<string, any>>({});

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
            nextTransitions.push({ value, state: 'open', _transitionId: transitionIdRef.current });
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
            !timeoutMapRef.current[transitionId]
        ) {
            timeoutMapRef.current[transitionId] = setTimeout(() => {
                delete timeoutMapRef.current[transitionId];
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

                                return { ...transition, state: 'opened' as TransitionState };
                            }

                            return transition;
                        });

                    if (isChanged) {
                        return { transitions: nextTransitions };
                    }

                    return curr;
                });
            }, duration);
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
        },
        [],
    );

    return transitions;
};

export { useTransitionValues };
