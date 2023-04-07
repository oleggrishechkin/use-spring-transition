export type SpringOptions = {
    mass?: number;
    stiffness?: number;
    damping?: number;
    initialVelocity?: number;
    threshold?: number;
};

export const createSpringSolver = ({
    mass = 1,
    stiffness = 100,
    damping = 10,
    initialVelocity = 0,
}: Omit<SpringOptions, 'threshold'> = {}) => {
    const m_w0 = Math.sqrt(stiffness / mass);
    const m_zeta = damping / (2 * Math.sqrt(stiffness * mass));
    const m_wd = m_zeta < 1 ? m_w0 * Math.sqrt(1 - m_zeta * m_zeta) : 0;
    const m_A = 1;
    const m_B = m_zeta < 1 ? (m_zeta * m_w0 + -initialVelocity) / m_wd : -initialVelocity + m_w0;

    return (t: number) => {
        const delta =
            m_zeta < 1
                ? Math.exp(-t * m_zeta * m_w0) * (m_A * Math.cos(m_wd * t) + m_B * Math.sin(m_wd * t))
                : (m_A + m_B * t) * Math.exp(-t * m_w0);

        return 1 - delta;
    };
};

export const normalizeSpringValue = (from: number, to: number, proportion: number) => from + (to - from) * proportion;

export const spring = ({
    options = {},
    onFrame,
    onEnd,
}: {
    options?: SpringOptions | number;
    onFrame?: (proportion: number) => void;
    onEnd?: () => void;
}) => {
    if (typeof options === 'number') {
        let timeoutId: any = null;
        let frameId: any = null;

        frameId = window.requestAnimationFrame(() => {
            frameId = null;

            if (onFrame) {
                onFrame(1);
            }

            timeoutId = setTimeout(() => {
                timeoutId = null;

                if (onEnd) {
                    onEnd();
                }
            }, options);
        });

        return () => {
            cancelAnimationFrame(frameId);
            frameId = null;
            clearTimeout(timeoutId);
            timeoutId = null;
        };
    }

    const { threshold = 0.01, ...springSolverOptions } = options;
    const solver = createSpringSolver(springSolverOptions);
    const startTime = Date.now() / 1000;
    let frameId: any = null;
    let framesAfterTargetReached = 0;
    const step = () => {
        if (!frameId) {
            return;
        }

        const elapsed = Date.now() / 1000 - startTime;
        const proportion = solver(elapsed);

        if (Math.abs(1 - proportion) <= threshold) {
            framesAfterTargetReached++;
        } else {
            framesAfterTargetReached = 0;
        }

        if (framesAfterTargetReached >= 10) {
            if (onEnd) {
                onEnd();
            }

            frameId = null;

            return;
        }

        if (onFrame) {
            onFrame(proportion);
        }

        frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(step);

    return () => {
        cancelAnimationFrame(frameId);
        frameId = null;
    };
};
