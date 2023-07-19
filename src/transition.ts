export const transition = ({
    duration = 0,
    onFrame,
    onEnd,
}: {
    duration?: number;
    onFrame?: (proportion: number) => void;
    onEnd?: () => void;
}) => {
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
        }, duration);
    });

    return () => {
        cancelAnimationFrame(frameId);
        frameId = null;
        clearTimeout(timeoutId);
        timeoutId = null;
    };
};
