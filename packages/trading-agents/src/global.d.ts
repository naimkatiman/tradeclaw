declare namespace JSX {
  interface Element {}
  interface ElementClass {}
  interface ElementAttributesProperty {
    props: unknown;
  }
  interface ElementChildrenAttribute {
    children: unknown;
  }
  interface IntrinsicAttributes {
    [name: string]: unknown;
  }
  interface IntrinsicElements {
    [elementName: string]: unknown;
  }
}
