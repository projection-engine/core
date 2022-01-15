import Shader from "../Shader";

import vertex from 'raw-loader!./resources/lightVertex.glsl'
import fragment from 'raw-loader!./resources/lightFragment.glsl'


export default class LightShader extends Shader{
    constructor(gpu) {
        super(vertex, fragment, gpu);
        this.positionLocation = gpu.getAttribLocation(this.program, 'position')

        this.transformationMatrixULocation= gpu.getUniformLocation(this.program, 'transformationMatrix')
        this.colorULocation = gpu.getUniformLocation(this.program, 'color')
        this.viewMatrixULocation = gpu.getUniformLocation(this.program, 'viewMatrix')
        this.projectionMatrixULocation =  gpu.getUniformLocation(this.program, 'projectionMatrix')
    }
}