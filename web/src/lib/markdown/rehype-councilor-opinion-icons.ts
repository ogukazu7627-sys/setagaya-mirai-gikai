import type { Element, ElementContent, Nodes, Root } from "hast";
import type { Plugin } from "unified";
import {
  COUNCILOR_ICON_URLS,
  DEFAULT_COUNCILOR_ICON_URL,
  getCouncilorIconUrl,
} from "./councilor-icon-config";
import { isCouncilorOpinionSectionTitle } from "./councilor-opinion-section";

export interface RehypeCouncilorOpinionIconsOptions {
  iconUrlByName?: Record<string, string>;
  defaultIconUrl?: string;
}

function isElement(node: Nodes): node is Element {
  return node.type === "element";
}

function getElementText(element: Element): string {
  return element.children
    .map((child) => {
      if (child.type === "text") {
        return child.value;
      }

      if (isElement(child)) {
        return getElementText(child);
      }

      return "";
    })
    .join("")
    .trim();
}

function appendClassName(
  properties: Element["properties"],
  className: string
): Element["properties"] {
  const current = properties?.className;
  const classNames = Array.isArray(current)
    ? current.map(String)
    : typeof current === "string"
      ? current.split(/\s+/)
      : [];

  if (!classNames.includes(className)) {
    classNames.push(className);
  }

  return {
    ...properties,
    className: classNames,
  };
}

function createCouncilorIcon(src: string): Element {
  return {
    type: "element",
    tagName: "img",
    properties: {
      alt: "",
      className: ["councilor-opinion-icon"],
      decoding: "async",
      height: 40,
      loading: "lazy",
      src,
      width: 32,
    },
    children: [],
  };
}

function decorateSpeakerHeading(
  heading: Element,
  options: Required<RehypeCouncilorOpinionIconsOptions>
) {
  if (heading.tagName !== "h2") {
    return;
  }

  const headingText = getElementText(heading);
  if (!headingText) {
    return;
  }

  heading.properties = appendClassName(
    heading.properties,
    "councilor-opinion-heading"
  );

  const iconUrl = getCouncilorIconUrl(
    headingText,
    options.iconUrlByName,
    options.defaultIconUrl
  );
  const originalChildren = heading.children as ElementContent[];

  heading.children = [
    createCouncilorIcon(iconUrl),
    {
      type: "element",
      tagName: "span",
      properties: { className: ["councilor-opinion-name"] },
      children: originalChildren,
    },
  ];
}

function decorateSpeakerHeadingsInSection(
  element: Element,
  options: Required<RehypeCouncilorOpinionIconsOptions>
) {
  for (const child of element.children) {
    if (!isElement(child)) {
      continue;
    }

    if (child.tagName === "h2") {
      decorateSpeakerHeading(child, options);
      continue;
    }

    decorateSpeakerHeadingsInSection(child, options);
  }
}

export const rehypeCouncilorOpinionIcons: Plugin<
  [RehypeCouncilorOpinionIconsOptions?],
  Root
> = (options = {}) => {
  const resolvedOptions: Required<RehypeCouncilorOpinionIconsOptions> = {
    defaultIconUrl: options.defaultIconUrl ?? DEFAULT_COUNCILOR_ICON_URL,
    iconUrlByName: options.iconUrlByName ?? COUNCILOR_ICON_URLS,
  };

  return (tree) => {
    let inCouncilorOpinionSection = false;

    for (const child of tree.children) {
      if (!isElement(child)) {
        continue;
      }

      if (child.tagName === "h1") {
        inCouncilorOpinionSection = isCouncilorOpinionSectionTitle(
          getElementText(child)
        );
        continue;
      }

      if (!inCouncilorOpinionSection) {
        continue;
      }

      if (child.tagName === "h2") {
        decorateSpeakerHeading(child, resolvedOptions);
        continue;
      }

      if (child.tagName === "section") {
        decorateSpeakerHeadingsInSection(child, resolvedOptions);
      }
    }
  };
};
