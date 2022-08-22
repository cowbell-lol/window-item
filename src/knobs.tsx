/** @jsxImportSource sigl */
import $ from 'sigl'

import { fitGrid } from 'presets-bar'
import { KnobElement } from 'x-knob'

export interface KnobsBarElement extends $.Element<KnobsBarElement> {}

export const knobsThemes = ['zen', 'ableton', 'dark', 'flat', 'sweet']

@$.element()
export class KnobsBarElement extends $.mix(HTMLElement, $.mixins.observed()) {
  Knob = $.element(KnobElement)

  knobs = new $.RefSet<KnobElement>([
    // { id: cheapRandomId(), min: 0, max: 100, step: 0.01, value: 30 },
    // { id: cheapRandomId(), min: 0, max: 100, step: 0.01, value: 30 },
    // { id: cheapRandomId(), min: 0, max: 100, step: 0.01, value: 30 },
    // { id: cheapRandomId(), min: 0, max: 100, step: 0.01, value: 30 },
    // { id: cheapRandomId(), min: 0, max: 100, step: 0.01, value: 30 },
    // { id: cheapRandomId(), min: 0, max: 100, step: 0.01, value: 30 },
    // { id: cheapRandomId(), min: 0, max: 100, step: 0.01, value: 30 },
    // { id: cheapRandomId(), min: 0, max: 100, step: 0.01, value: 30 },
  ])

  @$.attr.out() knobsTheme: typeof knobsThemes[0] = 'zen'

  columns = 1
  rows = 1
  @$.attr() vertical = false

  mounted($: KnobsBarElement['$']) {
    $.effect(({ host, columns, rows }) => {
      host.style.setProperty('--cols', '' + columns)
      host.style.setProperty('--rows', '' + rows)
    })

    $.effect(({ size, knobs }) => {
      Object.assign($, fitGrid(size.width, size.height, knobs.length))
    })

    $.render(({ Knob, knobs, knobsTheme }) => (
      <>
        <style>
          {$.css /*css*/`
          :host {
            display: flex;
            width: 100%;
            height: 100%;
            flex-wrap: wrap;
            flex-direction: row;
          }
          ${Knob} {
            position: relative;
            display: inline-flex;
            width: calc(100% / var(--cols));
            height: calc(100% / var(--rows));
          }

          ${Knob}::part(svg) {
            width: auto;
            height: auto;
          }
          `('')}
        </style>

        {knobs.map(knob => (
          <Knob
            key={knob.id}
            targetValue={knob.value}
            {...knob}
            theme={knobsTheme}
          />
        ))}
      </>
    ))
  }
}
