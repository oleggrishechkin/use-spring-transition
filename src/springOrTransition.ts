import { spring, SpringOptions } from './spring';
import { transition } from './transition';

export const springOrTransition = ({
    options = {},
    onFrame,
    onEnd,
}: {
    options?: SpringOptions | number;
    onFrame?: (proportion: number) => void;
    onEnd?: () => void;
}) => {
    if (typeof options === 'number') {
        return transition({ duration: options, onFrame, onEnd });
    }

    return spring({ options, onFrame, onEnd });
};
