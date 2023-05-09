import { QueryTextProvider } from '../model/query-text-provider.js';
import { NamedParameterMariaDbService } from '../named-parameter-maria-db-service.js';
import { JestRatchet } from '../../../../dist/jest/index.js';
import { SortDirection } from '../model/sort-direction.js';

const prov: QueryTextProvider = {
  fetchQuery(queryPath: string): string {
    return null;
  },
  fetchAllQueries(): Record<string, string> {
    return null;
  },
};

const mariaDb = new NamedParameterMariaDbService(prov, JestRatchet.mock(), { databaseName: 'test', timeoutMS: 2_000 });

describe('query-builder', () => {
  it('builds filtered', () => {
    const queryBuilder = mariaDb.queryBuilder('named_parameter_tests.pagination_count_test');
    const build = queryBuilder.build();
    expect(build.query).toBe(
      "SELECT /* named_parameter_tests.pagination_count_test */b.`id`  FROM boards b WHERE b.id < 1000 UNION (SELECT x.'id'  FROM somewherelse WHERE x.'id' = 3)\n"
    );
  });

  it('builds unfiltered', () => {
    const queryBuilder = mariaDb.queryBuilder('named_parameter_tests.pagination_count_test');
    const build = queryBuilder.buildUnfiltered();
    expect(build.query).toBe(
      "SELECT /* named_parameter_tests.pagination_count_test */COUNT(*)  FROM boards b WHERE b.id < 1000 UNION (SELECT x.'id'  FROM somewherelse WHERE x.'id' = 3)\n"
    );
  });

  it('fails if param is missing', () => {
    const queryBuilder = mariaDb.queryBuilder('named_parameter_tests.pagination_count_test');
    const build = queryBuilder.build();
    expect(build.query).toBe(
      "SELECT /* named_parameter_tests.pagination_count_test */b.`id`  FROM boards b WHERE b.id < 1000 UNION (SELECT x.'id'  FROM somewherelse WHERE x.'id' = 3)\n"
    );
  });

  it('removes conditional blocks when missing', () => {
    const queryBuilder = mariaDb.queryBuilder('named_parameter_tests.conditional_section_test');
    const build = queryBuilder.build();
    expect(build.query).toBe('SELECT /* named_parameter_tests.conditional_section_test */b.`id` FROM boards b WHERE b.id < 1000 \n');
  });

  it('handles negated conditional blocks true state', () => {
    const queryBuilder = mariaDb.queryBuilder('named_parameter_tests.negated_conditional_section_test');
    queryBuilder.withConditional('COND1');
    const build = queryBuilder.build();
    expect(build.query).toBe(
      'SELECT /* named_parameter_tests.negated_conditional_section_test */b.`id` FROM boards b WHERE b.id < 1000 \n'
    );
  });

  it('handles negated conditional blocks false state', () => {
    const queryBuilder = mariaDb.queryBuilder('named_parameter_tests.negated_conditional_section_test');
    queryBuilder.withConditional('COND1', false);
    const build = queryBuilder.build();
    expect(build.query).toBe(
      'SELECT /* named_parameter_tests.negated_conditional_section_test */b.`id` FROM boards b WHERE b.id < 1000  AND b.owner_id = :ownerId \n'
    );
  });

  it('leaves conditional blocks when present', () => {
    const queryBuilder = mariaDb.queryBuilder('named_parameter_tests.conditional_section_test');
    queryBuilder.withConditional('COND1');
    const build = queryBuilder.build();
    expect(build.query).toBe(
      'SELECT /* named_parameter_tests.conditional_section_test */b.`id` FROM boards b WHERE b.id < 1000  AND b.owner_id = :ownerId \n'
    );
  });

  it('leaves param-conditional blocks when param exists', () => {
    const queryBuilder = mariaDb.queryBuilder('named_parameter_tests.conditional_param_section_test');
    queryBuilder.withParam('ownerId', 'testvalue');
    const build = queryBuilder.build();
    expect(build.query).toBe(
      'SELECT /* named_parameter_tests.conditional_param_section_test */b.`id` FROM boards b WHERE b.id < 1000  AND b.owner_id = :ownerId \n'
    );
  });

  it('removes param-conditional blocks when param missing', () => {
    const queryBuilder = mariaDb.queryBuilder('named_parameter_tests.conditional_param_section_test');
    const build = queryBuilder.build();
    expect(build.query).toBe('SELECT /* named_parameter_tests.conditional_param_section_test */b.`id` FROM boards b WHERE b.id < 1000 \n');
  });

  it('removes param-conditional blocks when param is an empty array', () => {
    const queryBuilder = mariaDb.queryBuilder('named_parameter_tests.conditional_param_section_test');
    queryBuilder.withParam('ownerId', []);
    const build = queryBuilder.build();
    expect(build.query).toBe('SELECT /* named_parameter_tests.conditional_param_section_test */b.`id` FROM boards b WHERE b.id < 1000 \n');
  });

  it('applies query fragments', () => {
    const queryBuilder = mariaDb.queryBuilder('named_parameter_tests.named_test_1');
    const build = queryBuilder.build();
    expect(build.query).toBe(
      'SELECT /* named_parameter_tests.named_test_1 */b.`id`, b.`owner_id`, b.`name` FROM boards b\n WHERE id=:boardId OR owner_id=:ownerId\n'
    );
  });

  it('applies sql constructs', () => {
    const queryBuilder = mariaDb.queryBuilder('named_parameter_tests.sql_construct_test');
    queryBuilder.withSqlConstruct('groupingColumn', 'test_column');
    const build = queryBuilder.build();
    expect(build.query).toBe('GROUP /* named_parameter_tests.sql_construct_test */BY x.test_column\n');
  });

  it('expands object arrays', () => {
    const queryBuilder = mariaDb.queryBuilder('named_parameter_tests.new_repeat_section_test');
    queryBuilder.withExpandedParam(
      'cls',
      [
        { w: 1, h: 1 },
        { w: 2, h: 2 },
      ],
      true
    );
    expect(queryBuilder.fetchCopyOfParam('clsW0')).toBe(1);
    expect(queryBuilder.fetchCopyOfParam('clsW1')).toBe(2);
    expect(queryBuilder.fetchCopyOfParam('clsH0')).toBe(1);
    expect(queryBuilder.fetchCopyOfParam('clsH1')).toBe(2);
  });

  it('expands string arrays', () => {
    const queryBuilder = mariaDb.queryBuilder('named_parameter_tests.new_repeat_section_test');
    queryBuilder.withExpandedParam('cls', ['s0', 's1'], true);
    expect(queryBuilder.fetchCopyOfParam('cls0')).toBe('s0');
    expect(queryBuilder.fetchCopyOfParam('cls1')).toBe('s1');
  });

  it('applies repeat blocks', () => {
    const queryBuilder = mariaDb.queryBuilder('named_parameter_tests.new_repeat_section_test');
    queryBuilder.withExpandedParam(
      'cls',
      [
        { w: 1, h: 1 },
        { w: 2, h: 2 },
      ],
      true
    );
    const build = queryBuilder.build();
    expect(build.query).toBe(
      ' /* named_parameter_tests.new_repeat_section_test */repeated :clsW1 :clsH1 clause AND repeated :clsW0 :clsH0 clause \n'
    );
  });

  it('applies pagination', () => {
    const queryBuilder = mariaDb.queryBuilder('named_parameter_tests.conditional_param_section_test');
    queryBuilder.withPaginator({ s: SortDirection.Desc, cn: 'id', max: 1000, l: 25 });
    const build = queryBuilder.build();
    expect(build.query).toBe(
      'SELECT /* named_parameter_tests.conditional_param_section_test */b.`id` FROM boards b WHERE b.id < 1000 \n ORDER BY id Desc LIMIT :queryBuilderLimit'
    );
    expect(build.namedParams).toStrictEqual({
      queryBuilderLimit: 20,
    });
  });
});
