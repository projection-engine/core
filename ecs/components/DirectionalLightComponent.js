import Component from "../basic/Component";
import {mat4} from "gl-matrix";

export default class DirectionalLightComponent extends Component {
    color = [1, 1, 1]
    _direction = [0, 0, 0]
    _zNear = -1
    _zFar = 10000
    _transformationMatrix = Array.from(mat4.create())
    lightView = Array.from(mat4.create())
    lightProjection = Array.from(mat4.create())
    _size = 35
    _atlasFace = [0,0]

    constructor(id) {
        super(id, 'DirectionalLightComponent');
        this._update()

    }
    set atlasFace(data){
        this._atlasFace = data
    }
    get atlasFace(){
        return this._atlasFace
    }
    get zNear() {
        return this._zNear
    }

    set zNear(data) {
        this._zNear = data
        this._update()
    }


    get zFar() {
        return this._zFar
    }

    set zFar(data) {
        this._zFar = data
        this._update()
    }


    get direction() {
        return this._direction
    }

    set direction(data) {
        this._direction = data
        this._update()

        this._transformationMatrix[12] = data[0]
        this._transformationMatrix[13] = data[1]
        this._transformationMatrix[14] = data[2]
    }

    get transformationMatrix() {
        return this._transformationMatrix
    }

    get size() {
        return this._size
    }

    set size(data) {
        this._size = data
        this._update()
    }


    _update() {
        this.lightView = Array.from(mat4.create());
        mat4.lookAt(this.lightView, this._direction, [0, 0, 0], [0, 1, 0])

        this.lightProjection = Array.from(mat4.create());
        mat4.ortho(this.lightProjection, -this._size, this._size, -this._size, this._size, this._zNear, this._zFar);
    }

}