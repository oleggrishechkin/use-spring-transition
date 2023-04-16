import { useEffect, useMemo, useRef, useState } from 'react';

import {
    STAGES,
    Stage,
    Options,
    Values,
    getOpenOptions,
    getCloseOptions,
    getOpenTo,
    getCloseTo,
} from './useSpringTransition';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
import { normalizeSpringValue, spring } from './spring';

type Transition<T> = {
    value: T;
    stage: Stage;
    springValue: number;
    _transitionId: number;
    _prevSpringValue: number | null;
};

export const useSpringTransitions = <T>(
    value: T,
    options: Options = {},
    values: Values = { from: 0, to: 1 },
): { value: T; stage: Stage; springValue: number }[] => {
    const counterRef = useRef(0);
    const transitionIdRef = useRef(-1);
    const [inst, setState] = useState<{
        transitions: Transition<T>[];
    }>(() => ({
        transitions: [
            {
                value,
                stage: STAGES.OPENED,
                springValue: getOpenTo(values),
                _transitionId: transitionIdRef.current,
                _prevSpringValue: null,
            },
        ],
    }));
    const cleanupsMapRef = useRef<Record<string, () => void>>({});

    useMemo(() => {
        const nextTransitionId = counterRef.current++;
        let isNew = true;
        let isChanged = false;
        const nextTransitions: Transition<T>[] = [];

        for (const transition of inst.transitions) {
            if (transition.value === value) {
                isNew = false;

                switch (transition.stage) {
                    case STAGES.CLOSE:
                    case STAGES.CLOSING:
                    case STAGES.CLOSED: {
                        isChanged = true;

                        nextTransitions.push({
                            ...transition,
                            stage: STAGES.OPEN,
                            _transitionId: nextTransitionId,
                            _prevSpringValue: transition.springValue,
                        });

                        continue;
                    }
                }
            } else {
                switch (transition.stage) {
                    case STAGES.OPEN:
                    case STAGES.OPENING:
                    case STAGES.OPENED: {
                        isChanged = true;

                        nextTransitions.push({
                            ...transition,
                            stage: STAGES.CLOSE,
                            _transitionId: nextTransitionId,
                            _prevSpringValue: transition.springValue,
                        });

                        continue;
                    }
                }
            }

            nextTransitions.push(transition);
        }

        if (isNew) {
            isChanged = true;
            nextTransitions.push({
                value,
                stage: STAGES.OPEN,
                springValue: values.from,
                _transitionId: nextTransitionId,
                _prevSpringValue: null,
            });
        }

        if (isChanged) {
            transitionIdRef.current = nextTransitionId;
            inst.transitions = nextTransitions;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const { transitions } = inst;
    const transitionId = transitionIdRef.current;

    useIsomorphicLayoutEffect(() => {
        if (transitionId === -1) {
            return;
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
            cleanupsMapRef.current[data.key] = spring({
                options: data.options,
                onFrame: (proportion) => {
                    setState((curr) => {
                        let isChanged = false;
                        const nextTransitions: Transition<T>[] = [];

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
                                                transition._prevSpringValue ?? values.from,
                                                getOpenTo(values),
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
                                                transition._prevSpringValue ?? getOpenTo(values),
                                                getCloseTo(values),
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
                        const nextTransitions: Transition<T>[] = [];

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
                                            springValue: getOpenTo(values),
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
