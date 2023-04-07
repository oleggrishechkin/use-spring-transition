import { useEffect, useMemo, useRef, useState } from 'react';

import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
import { SpringOptions, normalizeSpringValue, spring } from './spring';

export const STAGES = {
    OPEN: 'open',
    OPENING: 'opening',
    OPENED: 'opened',
    CLOSE: 'close',
    CLOSING: 'closing',
    CLOSED: 'closed',
} as const;

export type Stage = (typeof STAGES)[keyof typeof STAGES];

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
        stage: opened ? STAGES.OPENED : STAGES.CLOSED,
        springValue: opened ? getOpenTo(values) : values.from,
    });
    const cleanupRef = useRef(() => {});

    useMemo(() => {
        if ((inst.stage === STAGES.OPENED && opened) || (inst.stage === STAGES.CLOSED && !opened)) {
            return;
        }

        cleanupRef.current();
        inst.stage = opened ? STAGES.OPEN : STAGES.CLOSE;

        if (opened) {
            inst.springValue = values.from;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened]);

    const { springValue, stage } = inst;

    useIsomorphicLayoutEffect(() => {
        switch (stage) {
            case STAGES.OPEN: {
                cleanupRef.current = spring({
                    options: getOpenOptions(options),
                    onFrame: (proportion) =>
                        setState({
                            stage: STAGES.OPENING,
                            springValue: normalizeSpringValue(springValue, getOpenTo(values), proportion),
                        }),
                    onEnd: () => setState({ stage: STAGES.OPENED, springValue: getOpenTo(values) }),
                });

                break;
            }
            case STAGES.CLOSE: {
                cleanupRef.current = spring({
                    options: getCloseOptions(options),
                    onFrame: (proportion) =>
                        setState({
                            stage: STAGES.CLOSING,
                            springValue: normalizeSpringValue(springValue, getCloseTo(values), proportion),
                        }),
                    onEnd: () => setState({ stage: STAGES.CLOSED, springValue: getCloseTo(values) }),
                });

                break;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage]);

    useEffect(() => () => cleanupRef.current(), []);

    return { stage, springValue };
};
