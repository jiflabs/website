declare module "asciinema-player" {
    export interface Player {
        el: unknown;
        dispose: () => void;
        getCurrentTime: () => Promise<unknown>;
        getDuration: () => Promise<unknown>;
        play: () => Promise<void>;
        pause: () => Promise<void>;
        seek: (pos: unknown) => Promise<void>;
    }

    export function create(src: string, elem: Node): Player;
}
