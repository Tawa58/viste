import { describe, expect, it } from 'vitest'
import { generateClassTeacherComment } from '@/lib/class-teacher-comment'

const score = (subjectName: string, percent: number) => ({
  subjectId: subjectName.toLowerCase(),
  subjectName,
  score: percent,
  maxScore: 100,
  percent,
  grade: '',
})

describe('generateClassTeacherComment', () => {
  it('returns empty when there are no results', () => {
    expect(
      generateClassTeacherComment({ firstName: 'Tino', average: null, subjects: [], period: 'TERM' }),
    ).toBe('')
  })

  it('mentions average, strongest and weakest subjects', () => {
    const comment = generateClassTeacherComment({
      firstName: 'Tino',
      average: 62,
      subjects: [score('Mathematics', 85), score('History', 40), score('English', 61)],
      period: 'MONTH',
    })
    expect(comment).toContain('Tino')
    expect(comment).toContain('this month')
    expect(comment).toContain('62%')
    expect(comment).toContain('Strongest subject: Mathematics.')
    expect(comment).toContain('More attention is needed in History.')
  })
})
