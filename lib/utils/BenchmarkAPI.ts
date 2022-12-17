let currentSamples = 0, maxSamples = 1000
export default class BenchmarkAPI {
    static contexts = new Map()
    static currentSamples = 0
    static onUpdate?:Function
    static onReset?:Function
    static onSampleCount?:Function
    static get maxSamples():number {
        return maxSamples
    }

    static set maxSamples(data) {
        maxSamples = data
        const labels = Array.from(BenchmarkAPI.contexts.keys())
        labels.forEach(k => BenchmarkAPI.registerTrack(k))
    }



    static registerTrack(label) {
        BenchmarkAPI.contexts.set(label, [0, new Float32Array(maxSamples), -1])
    }

    static track(label) {
        let context = BenchmarkAPI.contexts.get(label)
        if (!context) {
            BenchmarkAPI.registerTrack(label)
            context = BenchmarkAPI.contexts.get(label)
        }
        context[2] = performance.now()
    }

    static endTrack(label:string) {

        currentSamples++
        if (currentSamples >= maxSamples) {
            currentSamples = 0
            BenchmarkAPI.onSampleCount?.()
        }
        BenchmarkAPI.currentSamples = currentSamples
        const context = BenchmarkAPI.contexts.get(label)
        const ARR = context[1]
        const currentElapsed = performance.now() - context[2]

        ARR[context[0]] = currentElapsed
        context[0] += 1
        BenchmarkAPI.onUpdate?.(label, currentElapsed)
        if (maxSamples <= context[0]) {
            BenchmarkAPI.onReset?.(label, Array.from(ARR))
            context[0] = 0
        }
    }
}