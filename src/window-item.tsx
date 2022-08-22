/** @jsxImportSource sigl */
import $ from 'sigl'

import { cheapRandomId } from 'everyday-utils'
import { IconSvg } from 'icon-svg'
import { PresetElement, PresetsBarElement, randomName } from 'presets-bar'
import { Plug, WindowPlugElement, WindowPlugSceneElement } from 'window-plug'
import { ContextMenuOption, WorkspaceWindowControl, WorkspaceWindowElement } from 'x-workspace'

import type { AudioTransportElement } from 'audio-transport'
import { KnobElement } from 'x-knob'
import { KnobsBarElement, knobsThemes } from './knobs'
import { VisualizerAudioElement } from './visualizer-audio'

export type { AudioTransportElement }
export { PresetElement, PresetsBarElement }

export const IO = {
  Midi: 'midi',
  Audio: 'audio',
} as const

export interface WindowItemElement<T extends object> extends $.Element<WindowItemElement<T>> {}

@$.element()
export class WindowItemElement<T extends object> extends $(WorkspaceWindowElement) {
  @$.out() kind!: string //keyof SceneElement['Machines']

  KnobsBar = $.element(KnobsBarElement)
  WindowPlug = $.element(WindowPlugElement)
  PresetsBar = $.element(PresetsBarElement<T>)

  Knobs?: () => JSX.Element
  Plugs?: () => JSX.Element
  Presets?: () => JSX.Element
  Style?: () => JSX.Element

  scene!: any
  plugScene?: WindowPlugSceneElement
  plugs?: HTMLDivElement
  @$.out() knobsBar?: KnobsBarElement
  @$.out() presetsBar?: PresetsBarElement<T>
  @$.out() visualizerAudio: VisualizerAudioElement | false = false

  audioTransport?: AudioTransportElement
  audioNode?: AudioNode

  declare inputs?: $.RefSet<WindowPlugElement>
  declare outputs?: $.RefSet<WindowPlugElement>

  audioParams?: AudioParamMap

  presetDetail?: T

  @$.out() presets = new $.RefSet<PresetElement<T>>([
    { name: randomName(), id: cheapRandomId(), isDraft: true },
    { name: randomName(), id: cheapRandomId(), isDraft: true },
  ])

  @$.out() knobs = new $.RefSet<KnobElement>([
    // { id: cheapRandomId(), min: 0, max: 100, step: 0.01, value: 30 },
    // { id: cheapRandomId(), min: 0, max: 100, step: 0.01, value: 30 },
    // { id: cheapRandomId(), min: 0, max: 100, step: 0.01, value: 30 },
    // { id: cheapRandomId(), min: 0, max: 100, step: 0.01, value: 30 },
    // { id: cheapRandomId(), min: 0, max: 100, step: 0.01, value: 30 },
    // { id: cheapRandomId(), min: 0, max: 100, step: 0.01, value: 30 },
    // { id: cheapRandomId(), min: 0, max: 100, step: 0.01, value: 30 },
    // { id: cheapRandomId(), min: 0, max: 100, step: 0.01, value: 30 },
  ])

  withOtherPlug = $(this).reduce(({ plugScene }) =>
    (otherPlug: Plug, fn: (audioNode: AudioNode) => any) => {
      const otherPlugEl = plugScene.plugsMap.get(otherPlug)
      if (otherPlugEl) {
        return otherPlugEl.$.effect.once(({ dest }) =>
          (dest as WindowItemElement<T>).$.effect.once(
            ({ audioNode: otherAudioNode }) => {
              return fn(otherAudioNode)
            }
          )
        )
      }
    }
  )

  disconnectAll = $(this).reduce(({ inputs, outputs }) =>
    () => {
      // TODO: plug|plugEl.disconnectAll()
      for (const plugEl of inputs) {
        for (const cable of plugEl.plug!.cables.keys()) {
          plugEl.plug!.disconnect(cable)
        }
      }
      for (const plugEl of outputs) {
        for (const cable of plugEl.plug!.cables.keys()) {
          plugEl.plug!.disconnect(cable)
        }
      }
    }
  )

  removeSelf?: () => void

  destroy = $(this).reduce(({ disconnectAll, removeSelf }) =>
    () => {
      disconnectAll()
      removeSelf()
    }
  )

  visualizerAudioActive = false

  mounted($: WindowItemElement<T>['$']) {
    // TODO: not sure how to deal with this in a cleaner way.
    //  We need the icon to be reactive to this child's child .disabled
    //  property in the Controls part.
    $.effect(({ visualizerAudio }) => {
      if (visualizerAudio) {
        $.visualizerAudioActive = true
        return visualizerAudio.$.effect(({ visualizer }) =>
          visualizer.$.effect(({ disabled }) => {
            $.visualizerAudioActive = !disabled
          })
        )
      }
    })

    // TODO: This part is reactive at the task because it's being moved
    // when going full-size and at full-size exit it otherwise becomes
    // visually unresponsive because of some race-condition, most likely in html-vdom
    // not having implemented a proper tail queue for parts yet. There's a todo item
    // left there, so this should be revisited when it's solved.
    $.Controls = $.part.task((
      {
        host,
        vertical,
        fullSize,
        surface,
        visualizerAudio,
        visualizerAudioActive,
      },
    ) => (
      <>
        {visualizerAudio && (
          <WorkspaceWindowControl
            action={() => {
              ;(visualizerAudio as VisualizerAudioElement)?.visualizer
                ?.cycle()
            }}
          >
            <IconSvg
              set="tabler"
              icon={!visualizerAudioActive
                ? 'minus'
                : 'wave-sine'}
            />
          </WorkspaceWindowControl>
        )}

        <WorkspaceWindowControl
          action={() => {
            if (fullSize) {
              surface.exitFullSize?.()
            } else {
              surface.makeFullSize(host)
            }
          }}
        >
          <IconSvg
            set="tabler"
            icon="maximize"
          />
        </WorkspaceWindowControl>

        <WorkspaceWindowControl
          action={() => {
            $.vertical = !$.vertical
          }}
        >
          <IconSvg
            set="tabler"
            icon={vertical ? 'layout-sidebar-right' : 'layout-bottombar'}
          />
        </WorkspaceWindowControl>
      </>
    ))

    $.ContextMenu = $.part(({ destroy, doRenameLabel }) => (
      <>
        <ContextMenuOption keyboard={['Alt', 'M']}>Mute</ContextMenuOption>
        <ContextMenuOption keyboard={['Alt', 'O']}>Solo</ContextMenuOption>
        <hr />
        <ContextMenuOption keyboard={['Alt', 'R']} action={doRenameLabel}>
          Rename
        </ContextMenuOption>
        <ContextMenuOption keyboard={['Alt', 'D']}>Duplicate</ContextMenuOption>
        <ContextMenuOption keyboard={['Alt', 'W']} action={destroy}>
          Send to Trash
        </ContextMenuOption>
      </>
    ))

    $.effect(({ audioNode, withOtherPlug, outputs }) =>
      $.chain(
        outputs.refs.map(plugEl =>
          plugEl.$.effect(({ plug }) => {
            const connect = (otherPlug: Plug) =>
              withOtherPlug(otherPlug, otherAudioNode => {
                audioNode.connect(otherAudioNode)
                return $.warn(() => {
                  audioNode.disconnect(otherAudioNode)
                })
              })
            return $.chain(
              ...[...plug.cables.values()].map(connect),
              $.on(plug).connect(({ detail: { plug: otherPlug } }) => connect(otherPlug)),
              $.on(plug).disconnect(({ detail: { plug: otherPlug } }) => {
                withOtherPlug(
                  otherPlug,
                  $.warn(otherAudioNode => {
                    audioNode.disconnect(otherAudioNode)
                  })
                )
              })
            )
          })
        )
      )
    )

    $.Plugs = $.part((
      { host, WindowPlug, plugScene, inputs, outputs, onContextMenu },
    ) => (
      <div ref={$.ref.plugs} part="plugs">
        {[
          ['inputs', inputs] as const,
          ['outputs', outputs] as const,
        ].map(([part, plugs]) => (
          <div part={part}>
            {plugs.map(plug => (
              <WindowPlug
                {...plug}
                part="plug"
                dest={host}
                scene={plugScene}
                oncontextmenu={onContextMenu(() => (
                  <>
                    <ContextMenuOption
                      keyboard={['Alt', 'M']}
                      disabled={!plug.ref.current?.plug?.cables.size}
                    >
                      Mute All
                    </ContextMenuOption>
                    <ContextMenuOption
                      keyboard={['Alt', 'D']}
                      disabled={!plug.ref.current?.plug?.cables.size}
                    >
                      Disconnect All
                    </ContextMenuOption>
                  </>
                ))}
              />
            ))}
          </div>
        ))}
      </div>
    ), <div></div>)

    // pull presets
    $.effect(({ presetsBar }) =>
      presetsBar.$.effect(({ presets }) => {
        $.presets = presets
      })
    )

    $.effect(({ presetsBar }) =>
      presetsBar.$.effect(({ selectedPreset }) => {
        $.presetDetail = selectedPreset.detail
      })
    )

    // update current preset when detail changes
    $.effect(({ presetsBar, presetDetail }) => {
      if (Object.values(presetDetail).every(x => x != null)) {
        if (presetDetail !== presetsBar.selectedPreset?.detail) {
          presetsBar.updatePreset?.(presetDetail as T)
        }
      }
    })

    $.Presets = $.part(({ PresetsBar, presets, onContextMenu }) => (
      <PresetsBar
        ref={$.ref.presetsBar}
        presets={presets.length
          ? presets
          : new $.RefSet<PresetElement<T>>([{
            name: randomName(),
            id: cheapRandomId(),
            isDraft: true,
          }])}
        onpointerdown={$.event.capture(e => {
          if (
            (e.buttons & $.MouseButton.Left) && (e.ctrlKey || e.metaKey)
            && e.shiftKey
          ) {
            const path = e.composedPath()
            const preset = path.find(x => x instanceof PresetElement) as
              | PresetElement<any>
              | undefined

            if (preset) {
              e.stopImmediatePropagation()
              e.preventDefault()
              presets.remove(preset)
            }
          }
        })}
        oncontextmenu={onContextMenu(({ event }) => {
          const presetsBar = $.ref.presetsBar.current!
          const path = event.composedPath()
          const preset = path.find(x => x instanceof PresetElement) as
            | PresetElement<any>
            | undefined

          if (preset)
            return (
              <>
                {preset.isDraft
                  && (
                    <ContextMenuOption
                      keyboard={['Alt', 'K']}
                      action={() => {
                        preset.isDraft = false
                      }}
                    >
                      Keep {preset.name}
                    </ContextMenuOption>
                  )}

                <ContextMenuOption
                  keyboard={['Alt', 'M']}
                  action={() => {
                    preset.name = randomName()
                  }}
                >
                  Change symbol
                </ContextMenuOption>

                <ContextMenuOption
                  keyboard={['Alt', 'R']}
                  action={() => {
                    presetsBar!.selectedId =
                      preset.id =
                        cheapRandomId()
                  }}
                >
                  Change color
                </ContextMenuOption>

                <ContextMenuOption
                  keyboard={['Alt', 'D']}
                  action={() => {
                    presetsBar!.derivePreset(
                      preset as $.CleanInstance<typeof preset>
                    )
                  }}
                >
                  Duplicate {preset.name}
                </ContextMenuOption>

                <hr />

                <ContextMenuOption
                  keyboard={['Alt', 'X']}
                  action={() => {
                    presets.remove(preset)
                  }}
                >
                  Delete {preset.name}
                </ContextMenuOption>
              </>
            )
        })}
      />
    ))

    $.knobs = $.reduce(({ audioParams }) =>
      new $.RefSet<KnobElement>(
        [...audioParams].map(([id, param]) => ({
          id,
          min: param.minValue,
          max: param.maxValue,
          step: (param.maxValue - param.minValue) / 128,
          value: param.value,
        }))
      )
    )

    $.Knobs = $.part(({ KnobsBar, knobs, onContextMenu }) => (
      <KnobsBar
        ref={$.ref.knobsBar}
        knobs={knobs}
        oncontextmenu={onContextMenu(() => {
          const knobsBar = $.ref.knobsBar.current!
          return (
            <>
              <ContextMenuOption
                keyboard={['Alt', 'E']}
                action={() => {
                  knobsBar.knobsTheme = knobsThemes[
                    (knobsThemes.indexOf(knobsBar.knobsTheme) + 1)
                    % knobsThemes.length
                  ]
                }}
              >
                Change style
              </ContextMenuOption>
            </>
          )
        })}
      />
    ))

    $.Style = $.part(({ WindowPlug }) => (
      <style>
        {$.css /*css*/`
          :host {
          --audio: #09f;
          --midi: #a80;
          --plug-width: 28px;
          display: flex;
        }
        [part=contents] {
          display: flex;
          flex-flow: column nowrap;
        }
        [part=plugs] {
          contain: layout style;
          position: absolute;
          height: 100%;
          width: 100%;
        }
        [part=plugs] > * {
          width: var(--plug-width);
          height: 100%;
          pointer-events: none;

          display: flex;
          flex-flow: column nowrap;
          align-items: center;
          justify-content: center;

          position: absolute;
          gap: 20px;
        }
        [part=inputs] {
          left: calc(-1 * var(--plug-width));
          top: 0;
        }
        [part=outputs] {
          right: calc(-1 * var(--plug-width));
          top: 0;
        }
        [part=plug] {
          display: inline-flex;
          width: var(--plug-width);
          pointer-events: all;
          cursor: copy;
        }
        [part=inputs] [part=plug] {
        }
        [part=outputs] [part=plug] {
        }
        [data-cable-kind=audio][data-plug-kind=input]::part(plug) {
          background: var(--audio);
        }
        [data-cable-kind=audio][data-plug-kind=output]::part(plug) {
          background: var(--audio);
        }
        [data-cable-kind=midi][data-plug-kind=input]::part(plug) {
          background: var(--midi);
        }
        [data-cable-kind=midi][data-plug-kind=output]::part(plug) {
          background: var(--midi);
        }
        ${WindowPlug}::part(plug) {
          /* opacity: 0.55; */
          /* transition: opacity 78ms cubic-bezier(0, 0.35, .15, 1); */
          z-index: 1;
        }
        ${WindowPlug}::part(back) {
          background: #000;
          z-index: 0;
        }
        ${WindowPlug}:hover::part(plug) {
          /* opacity: 0.75; */
        }
        ${WindowPlug}.disabled::part(plug) {
          opacity: 0.2;
        }
        ${WindowPlug}.enabled::part(plug) {
          opacity: 0.85;
        }
        ${WindowPlug}.active::part(plug) {
          /* opacity: 1; */
        }
      `('')}
      </style>
    ))
  }
}
