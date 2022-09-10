export default class PickingAPI {
    static readBlock(depthFBO, start, end) {
        const w = Math.round(Math.abs(start.x - end.x))
        const h = Math.round(Math.abs(start.y - end.y))
        gpu.bindFramebuffer(gpu.FRAMEBUFFER, depthFBO.FBO)
        let dd = new Float32Array(w * h * 4)
        gpu.readPixels(
            end.x > start.x ? start.x : end.x,
            end.y > start.y ? start.y : end.y,
            w,
            h,
            gpu.RGBA,
            gpu.FLOAT,
            dd
        )
        gpu.bindFramebuffer(gpu.FRAMEBUFFER, null)

        return dd
    }

    static depthPick(depthFBO, coords) {
        gpu.bindFramebuffer(gpu.FRAMEBUFFER, depthFBO.FBO)
        let dd = new Float32Array(4)
        gpu.readPixels(
            coords.x,
            coords.y,
            1,
            1,
            window.gpu.RGBA,
            window.gpu.FLOAT,
            dd
        )
        gpu.bindFramebuffer(gpu.FRAMEBUFFER, null)
        return dd
    }

}