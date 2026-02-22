import { create } from 'zustand';

export interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

interface ConfirmState {
    isOpen: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
}

interface ConfirmActions {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    handleConfirm: () => void;
    handleCancel: () => void;
}

export type ConfirmStore = ConfirmState & ConfirmActions;

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
    isOpen: false,
    options: null,
    resolve: null,

    confirm: (options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            set({
                isOpen: true,
                options,
                resolve,
            });
        });
    },

    handleConfirm: () => {
        const { resolve } = get();
        if (resolve) {
            resolve(true);
        }
        set({
            isOpen: false,
            options: null,
            resolve: null,
        });
    },

    handleCancel: () => {
        const { resolve } = get();
        if (resolve) {
            resolve(false);
        }
        set({
            isOpen: false,
            options: null,
            resolve: null,
        });
    },
}));

/**
 * Convenient hook to extract just the trigger function
 */
export const useConfirm = () => {
    return useConfirmStore((state) => state.confirm);
};
