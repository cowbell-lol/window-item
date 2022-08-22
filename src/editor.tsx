/** @jsxImportSource sigl */
import $ from 'sigl'

import { CodeEditElement, Lens, Marker } from 'code-edit'
import { syntax } from 'monolang'

export interface EditorElement extends $.Element<EditorElement> {}

@$.element()
export class EditorElement extends HTMLElement {
  CodeEdit = $.element(CodeEditElement)

  @$.out() editor?: CodeEditElement

  defaultValue?: string

  // markers / lenses
  errorMarkers: Marker[] = []
  paramMarkers: Marker[] = []
  errorLenses: Lens[] = []

  onKeyUp?: $.EventHandler<CodeEditElement, KeyboardEvent>
  onKeyDown?: $.EventHandler<CodeEditElement, KeyboardEvent>

  onInput?: (value: string) => void
  onSave?: (value: string) => void

  updateValue = $(this).reduce(({ editor }) =>
    (value: string | void) => {
      if (value != null) {
        const { hasFocus, scrollLeft, scrollTop } = editor
        if (editor.value === value) return

        const range = editor.textarea?.buffer?.getRange()
        editor.value = value
        if (editor.textarea) {
          Object.assign(editor.textarea, { scrollLeft, scrollTop })
        }
        if (hasFocus) {
          requestAnimationFrame(() => {
            editor.blur()
            editor.focus()
            if (range && editor.textarea) {
              editor.textarea.setSelectionRange(
                range.caretIndex,
                range.caretIndex
              )
            }
          })
        }
      }
    }, () => {})

  mounted($: EditorElement['$']) {
    $.effect(({ host, editor }) => {
      host.tabIndex = 0
      return $.on(host).focus(e => {
        if (!e.composedPath().includes(editor)) {
          editor.focus({ preventScroll: true })
        }
      })
    })

    //
    // markers / lenses
    //

    $.effect(({ editor, paramMarkers, errorMarkers }) => {
      editor.markers = [...errorMarkers, ...paramMarkers]
    })

    $.effect(({ editor, errorLenses }) => {
      editor.lenses = [...errorLenses]
    })

    //
    // editor
    //

    $.onKeyDown = $.reduce(({ editor }) => (e => {
      //!? 'keydown', e.key

      // console.log('key down')
      // if (e.key === 's' && (e.altKey || e.ctrlKey || e.metaKey)) {
      //   e.preventDefault()
      //   onSave(editor.value)
      // }

      if (e.key === 'Escape' && !(e.altKey || e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        e.stopPropagation()
        editor.blur()
      }
    }), _ => {})

    $.onKeyUp = $.reduce(({ editor, onInput }) => (() => {
      onInput(editor.value)
    }), () => {})

    $.render(({ CodeEdit, defaultValue, onKeyUp, onKeyDown }) => (
      <>
        <style>
          {$.css /*css*/`
          [part=editor] {
            --selection: #41e;
            contain: size layout style paint;
            /* position: absolute; */
            width: 100%;
            height: 100%;
            padding: 5%;
            box-sizing: border-box;
            background: transparent;
            font-family: "Ubuntu Mono";
            /* overflow: scroll; */

            &::part(textarea) {
              /* padding-bottom: 10vh; */
            }
            &::part(parent) {
              resize: none;
            }
          }
          `('')}
        </style>

        <CodeEdit
          ref={$.ref.editor}
          part="editor"
          markersCss={selector =>
            $.css /*css*/`
            .param {
              background: #237;
              &.hover {
                cursor: ns-resize !important;
                background: #35a;
              }
            }
            .error {
              background: var(--brightRed);
            }
          `(selector)}
          comments="\ \* *\"
          syntax={syntax}
          value={$.ref.editor?.current?.value || defaultValue}
          fontSize={$.ref.editor?.current?.fontSize || 28}
          // shadow
          theme="ayu-mirage"
          onkeydown={onKeyDown}
          onkeyup={onKeyUp}
          onwheel={$.event.not.passive(e => {
            if (e.altKey) return
            // e.preventDefault()
            e.stopPropagation()
          })}
        >
        </CodeEdit>
      </>
    ))
  }
}
