export function stripMarkdown(text: string): string {

  return text

    .replace(/```[\s\S]*?```/g, (block) =>

      block.replace(/^```(?:json)?\n?/i, '').replace(/```$/, ''),

    )

    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')

    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')

    .replace(/(\*\*|__)(.*?)\1/g, '$2')

    .replace(/(\*|_)(.*?)\1/g, '$2')

    .replace(/`([^`]+)`/g, '$1')

    .replace(/^#+\s+/gm, '')

    .trim();

}


