import { Rectangle, Container } from 'pixi.js';

export class AbsoluteContainer extends Container {
    
    bounds: Rectangle;

    constructor() {
        super();
    }

    setBounds(bounds: Rectangle) {
        this.bounds = bounds;
    }

    getBounds(): Rectangle {
        return this.bounds;
    }

    static fromParent(container: AbsoluteContainer) {
        const instance = new AbsoluteContainer();
        instance.setBounds(container.getBounds().clone());
        return instance;
    } 

    static from(x: number, y: number, width: number, height: number) {
        const instance = new AbsoluteContainer();
        instance.setBounds(new Rectangle(x, y, width, height));
        return instance;
    }
    
    static horizontalSplit(container: AbsoluteContainer, splitRatio: number): [left: Rectangle, right: Rectangle] {
        const { x, y, width, height } = container.getBounds();
        return [
            new Rectangle(x, y, width * splitRatio, height),
            new Rectangle(x + width * splitRatio, y, width * (1 - splitRatio), height),
        ];
    }
}