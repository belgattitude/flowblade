import type { Metadata } from 'next';
import { generateStaticParamsFor, importPage } from 'nextra/pages';

import { useMDXComponents } from '../../mdx-components';

export const generateStaticParams = generateStaticParamsFor('mdxPath');

type Props = {
  params: Promise<{
    mdxPath: string[];
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { metadata } = (await importPage(params.mdxPath)) as {
    metadata: Metadata;
  };
  return metadata;
}

// eslint-disable-next-line react-hooks/rules-of-hooks
const Wrapper = useMDXComponents({}).wrapper;

export default async function Page(props: Props) {
  const params = await props.params;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const result = await importPage(params.mdxPath);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { default: MDXContent, toc, metadata } = result;
  return (
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    <Wrapper toc={toc} metadata={metadata}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  );
}
