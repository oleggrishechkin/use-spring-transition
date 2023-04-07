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

export const useSpringTransitions = <T>(
    value: T,
    options: Options = {},
    values: Values = { from: 0, to: 1 },
): { value: T; stage: Stage; springValue: number }[] => {
    const counterRef = useRef(0);
    const transitionIdRef = useRef(-1);
    const [inst, setState] = useState<{
        transitions: { value: T; stage: Stage; springValue: number; _transitionId: number }[];
    }>({
        transitions: [
            {
                value,
                stage: STAGES.OPENED,
                springValue: getOpenTo(values),
                _transitionId: transitionIdRef.current,
            },
        ],
    });
    const cleanupsMapRef = useRef<Record<string, () => void>>({});

    useMemo(() => {
        const nextTransitionId = counterRef.current++;
        let isNew = true;
        let isChanged = false;

        const nextTransitions = inst.transitions.map((transition) => {
            if (transition.value === value) {
                isNew = false;

                if (([STAGES.CLOSE, STAGES.CLOSING, STAGES.CLOSED] as Stage[]).includes(transition.stage)) {
                    isChanged = true;

                    return { ...transition, _transitionId: nextTransitionId, stage: STAGES.OPEN };
                }

                return transition;
            }

            if (([STAGES.OPEN, STAGES.OPENING, STAGES.OPENED] as Stage[]).includes(transition.stage)) {
                isChanged = true;

                return { ...transition, _transitionId: nextTransitionId, stage: STAGES.CLOSE };
            }

            return transition;
        });

        if (isNew) {
            isChanged = true;
            nextTransitions.push({
                value,
                stage: STAGES.OPEN,
                springValue: values.from,
                _transitionId: nextTransitionId,
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

        const springValuesByValueMap = transitions.reduce((res, transition) => {
            res.set(transition.value, transition.springValue);

            return res;
        }, new Map() as Map<T, number>);
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
                        const nextTransitions = curr.transitions.map((transition) => {
                            if (
                                data.isOpen &&
                                transition._transitionId === transitionId &&
                                ([STAGES.OPEN, STAGES.OPENING] as Stage[]).includes(transition.stage)
                            ) {
                                isChanged = true;

                                const springValue = springValuesByValueMap.get(transition.value);

                                return {
                                    ...transition,
                                    stage: STAGES.OPENING,
                                    springValue: normalizeSpringValue(
                                        springValue ?? values.from,
                                        getOpenTo(values),
                                        proportion,
                                    ),
                                };
                            }

                            if (
                                data.isClose &&
                                transition._transitionId === transitionId &&
                                ([STAGES.CLOSE, STAGES.CLOSING] as Stage[]).includes(transition.stage)
                            ) {
                                isChanged = true;

                                const springValue = springValuesByValueMap.get(transition.value);

                                return {
                                    ...transition,
                                    stage: STAGES.CLOSING,
                                    springValue: normalizeSpringValue(
                                        springValue ?? getOpenTo(values),
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
                    delete cleanupsMapRef.current[data.key];

                    setState((curr) => {
                        let isChanged = false;
                        const nextTransitions: typeof curr.transitions = [];

                        for (const transition of curr.transitions) {
                            if (
                                data.isOpen &&
                                transition._transitionId === transitionId &&
                                ([STAGES.OPEN, STAGES.OPENING] as Stage[]).includes(transition.stage)
                            ) {
                                isChanged = true;
                                nextTransitions.push({
                                    ...transition,
                                    stage: STAGES.OPENED,
                                    springValue: getOpenTo(values),
                                });

                                continue;
                            }

                            if (
                                data.isClose &&
                                transition._transitionId === transitionId &&
                                ([STAGES.CLOSE, STAGES.CLOSING] as Stage[]).includes(transition.stage)
                            ) {
                                isChanged = true;

                                continue;
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
            Object.keys(cleanupsMapRef.current).forEach((key) => {
                cleanupsMapRef.current[key]();
            });
            cleanupsMapRef.current = {};
        },
        [],
    );

    return transitions;
};
