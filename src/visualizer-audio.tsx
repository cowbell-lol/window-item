/** @jsxImportSource sigl */
import $ from 'sigl'

import themeData from 'plenty-themes/ayu-mirage.json'
import { VisualizerElement } from 'x-visualizer'

export { VisualizerElement }

export interface VisualizerAudioElement extends $.Element<VisualizerAudioElement> {}

@$.element()
export class VisualizerAudioElement extends HTMLElement {
  Visualizer = $.element(VisualizerElement)

  @$.out() visualizer?: VisualizerElement

  input?: AudioNode | null

  mounted($: VisualizerAudioElement['$']) {
    $.effect(({ input, visualizer }) => {
      visualizer.input = input
      return () => {
        visualizer.input = null
      }
    })

    $.render(({ Visualizer }) => (
      <>
        <style>
          {$.css /*css*/`
          :host {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          ${Visualizer} {
            height: 100%;
            width: 100%;

            &[kind=oscilloscope] {
              max-height: 200px;
            }
          }
        `('')}
        </style>
        <Visualizer
          ref={$.ref.visualizer}
          kind={$.ref.visualizer?.current?.kind || 'oscilloscope'}
          part="visualizer"
          autoResize
          background="#000"
          color={themeData.brightCyan}
          width={170}
          height={60}
        />
      </>
    ))
  }
}
