import { DependencyList, useMemo, useRef } from 'react';

const useUpdateOnRender = (onUpdateOnRender: () => void, deps: DependencyList) => {
    const mountedRef = useRef(false);

    useMemo(() => {
        if (!mountedRef.current) {
            mountedRef.current = true;

            return;
        }

        onUpdateOnRender();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
};

export { useUpdateOnRender };
