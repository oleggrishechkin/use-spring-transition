export type SpringOptions = {
    mass?: number;
    stiffness?: number;
    damping?: number;
    initialVelocity?: number;
    threshold?: number;
};

const createSpringSolver = ({ mass = 1, stiffness = 100, damping = 10, initialVelocity = 0 }: SpringOptions = {}) => {
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

const normalizeSpringValue = (from: number, to: number, proportion: number) => from + (to - from) * proportion;

const DEFAULT_THRESHOLD = 0.01;

const spring = (onFrame: (proportion: number) => void, onEnd: () => void, options?: SpringOptions) => {
    const solver = createSpringSolver(options);
    const startTime = Date.now() / 1000;
    let frameId: any = null;
    let framesAfterTargetReached = 0;
    const step = () => {
        if (!frameId) {
            return;
        }

        const elapsed = Date.now() / 1000 - startTime;
        const proportion = solver(elapsed);

        if (
            Math.abs(1 - proportion) <= (typeof options?.threshold === 'number' ? options.threshold : DEFAULT_THRESHOLD)
        ) {
            framesAfterTargetReached++;
        } else {
            framesAfterTargetReached = 0;
        }

        if (framesAfterTargetReached >= 10) {
            onEnd();
            frameId = null;

            return;
        }

        onFrame(proportion);
        frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(step);

    return () => {
        cancelAnimationFrame(frameId);
        frameId = null;
    };
};

export { createSpringSolver, normalizeSpringValue, spring };
