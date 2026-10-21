export const PEOPLE = { mina: '민아', jun: '준' };
export const ROOMS = { W: '서쪽', E: '동쪽', N: '북쪽' };
const memory = (id, owner, order, text, facts, source = '직접 관찰') =>
  ({ id, owner, order, text, source, facts, deleted: false });
const fact = (person, room) => ({ person, room });
const robot = (id, queue) => ({ id, queue, cursor: 0 });
export const STAGES = [
  {
    id: 'P01', title: '오래된 주소', chapter: '첫 번째 기록',
    intro: '민아는 서쪽으로 돌아왔습니다. 하지만 배송 로봇은 그 모습을 보지 못했죠.',
    goal: '민아에게 전환 통지서 1통을 전달하세요.',
    hint: '로봇은 가장 나중에 얻은 기억을 믿습니다. 그 기억을 잊으면 어떤 근거가 남을까요?',
    lesson: '잊는다고 반대를 믿는 것은 아닙니다. 남은 과거가 새로운 근거가 됩니다.',
    reality: { mina: 'W', jun: 'E' }, robots: [robot('A', ['mina'])],
    memories: [
      memory('A-01', 'A', 1, '민아가 서쪽 방에 들어갔다.', [fact('mina', 'W')]),
      memory('A-02', 'A', 2, '민아가 동쪽 방에 들어갔다.', [fact('mina', 'E')])
    ]
  },
  {
    id: 'P02', title: '하나의 장면', chapter: '두 번째 기록',
    intro: '민아와 준에게 보낼 편지가 남았습니다. 한 장면 안에는 두 사람의 기억이 함께 들어 있습니다.',
    goal: '민아 → 준 순서로, 편지 2통을 전달하세요.',
    hint: '한 장면을 지우면 두 사람의 정보가 함께 사라집니다. 지금 필요한 기억은 어느 것인가요?',
    lesson: '민아의 배송을 마친 뒤에야 그 장면을 지울 수 있었습니다. 기억의 역할에도 순서가 있습니다.',
    reality: { mina: 'W', jun: 'E' }, robots: [robot('A', ['mina', 'jun'])],
    memories: [
      memory('A-11', 'A', 1, '준이 동쪽 방에 들어갔다.', [fact('jun', 'E')]),
      memory('A-12', 'A', 2, '민아가 서쪽 방에 들어갔고, 준이 북쪽으로 이동했다.', [fact('mina', 'W'), fact('jun', 'N')]),
      memory('A-13', 'A', 3, '민아가 동쪽 방에 들어갔다.', [fact('mina', 'E')])
    ]
  },
  {
    id: 'P03', title: '전해진 말', chapter: '세 번째 기록',
    intro: 'A의 이야기는 이미 B에게 전해졌습니다. 원본을 지워도, 다른 대상에게 남은 기억은 사라지지 않습니다.',
    goal: 'A와 B의 편지를 모두 민아에게 전달하세요.',
    hint: '출처가 같아도 소유자는 다릅니다. 각 로봇이 현재 어떤 기억을 믿는지 살펴보세요.',
    lesson: '누군가 잊어도, 이미 전해진 말은 다른 이의 기억 속에 남습니다.',
    reality: { mina: 'W', jun: 'E' }, robots: [robot('A', ['mina']), robot('B', ['mina'])],
    memories: [
      memory('A-21', 'A', 1, '민아가 서쪽 방에 들어갔다.', [fact('mina', 'W')]),
      memory('A-22', 'A', 2, '민아가 동쪽 방에 들어갔다.', [fact('mina', 'E')]),
      memory('B-21', 'B', 1, '민아가 서쪽 방에 들어갔다.', [fact('mina', 'W')]),
      memory('B-22', 'B', 2, 'A에게 민아가 동쪽 방에 있다는 말을 들었다.', [fact('mina', 'E')], 'A에게 전해 들음')
    ]
  }
];
export const ENDINGS = {
  public: {
    title: '모두에게 남긴 기록', badge: '공개 공지',
    text: '주민들은 배송 시스템이 항상 현재를 아는 것은 아니라는 안내를 받았습니다. 기록소는 재검토 절차를 시작합니다.',
    note: '오류와 복구 과정이 공개 기록으로 남았습니다.'
  },
  internal: {
    title: '기록소에 남긴 밤', badge: '내부 보관',
    text: '서류는 무사히 전달되었습니다. 오류 보고서는 내부 보관함으로 향했고, 주민들에게는 새 공지가 나가지 않았습니다.',
    note: '오류와 복구 과정이 내부 검토 기록으로 남았습니다.'
  }
};
