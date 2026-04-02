# Questions & Scoring Reference

Краткий справочник по вопросам, весам ответов и формулам итогового скоринга.

## Navigation
- [Question option metrics](#question-option-metrics)
- [Scoring helpers (Python)](#scoring-helpers-python)
- [Example scored test output](#example-scored-test-output)
- [Test + LLM fusion](#test--llm-fusion)
- [Final ranking modes](#final-ranking-modes)


## Исследовательская база

Для формирования вопросов и алгоритмов оценки (вес каждого ответа по осям M, P, R, L, V) использовались следующие материалы:

- [Evaluating the Whole Applicant: Use of Situational Judgment Testing and Personality Testing to Address Disparities in Resident Selection](https://doi.org/10.1007/s11934-022-01115-8)
- [Personality and Leadership: Meta-Analytic Review of Cross-Cultural Moderation, Behavioral Mediation, and Honesty-Humility](https://psycnet.apa.org/fulltext/2024-74447-001.html)
- [A Nonverbal Behavior Approach to Identify Emergent Leaders in Small Groups](https://www.researchgate.net/publication/312996139_A_Nonverbal_Behavior_Approach_to_Identify_Emergent_Leaders_in_Small_Groups)



## Questions 1–10

1

Two days before a submission, I notice that one part of our shared document is confusing and may slow the team down. It is not officially my responsibility. I usually…
A) Draft a small practical fix and send it to the owner, asking whether it would be useful.
B) Wait until I understand the section more fully before suggesting changes.
C) Raise the concern in the group chat so the issue is visible to everyone.
D) Focus on my own part unless the owner asks for input.

2

When a group discussion reaches a dead end and no one suggests a next step, I usually…
A) Give the group a little more time to see whether someone else steps in.
B) Ask a question that could reopen the discussion from a different angle.
C) Offer a workable next step, even if it still needs refinement.
D) Suggest pausing the discussion and returning later with fresh ideas.

3

When I face a problem I have never encountered before, I usually…
A) Use available resources to explore solutions and test one carefully.
B) First review how similar problems were handled before acting.
C) Ask a more experienced person to help guide my next step.
D) Avoid changing anything until the situation becomes clearer.

4

If a teammate makes a mistake that affects my part of the project, I usually…
A) Talk with them directly and help fix the issue because the outcome is shared.
B) Inform the supervisor early so the solution can be coordinated.
C) Mention the problem and its impact, but keep my involvement limited.
D) Clarify what I completed correctly while waiting for direction on the rest.

5

If I promised to help someone but realize I will not make it on time, I usually…
A) Tell them I probably cannot help in time and briefly explain why.
B) Warn them early, apologize, and try to offer another workable option.
C) Wait a little before responding because I hope I may still manage it.
D) Hold off on saying anything until I know for sure whether timing improves.

6

If I promised the team to complete a task but realize I cannot, I usually…
A) Inform the team early and help reassign or restructure the task.
B) Keep working quietly and hope I can still complete enough of it.
C) Explain later that circumstances changed and affected what I could do.
D) Tell the team once I am sure I need help, even if it is quite late.

7

When I am learning something new and run into difficulty, I usually…
A) Treat it as part of learning and look for ways to move forward.
B) Step back because it may not be the right fit for me.
C) Put it aside for now and return when I have more energy for it.
D) Ask for help early so I do not spend too long stuck.

8

When I think about my future, I usually…
A) Identify the skills I need to build in order to move toward my goals.
B) Keep options open and decide later as things become clearer.
C) Listen to advice and gradually shape a direction over time.
D) Assume future outcomes depend more on opportunities that appear than on planning.

9

During class, I realize that an important concept was explained too briefly, and I will need it later for a project. I usually…
A) Find one or two reliable sources and check my understanding before using the concept.
B) Wait and see whether the next class makes it clearer.
C) Compare notes with classmates first and rely on that as a starting point.
D) Proceed with the project unless the missing details become a real problem.

10

When a task takes more time than expected, I usually…
A) Adjust my approach and keep working until I finish.
B) Switch to something else for a while so I do not get stuck.
C) Pause until I have more support, clarity, or resources.
D) Break the task into smaller parts so I can keep moving step by step.

11

When I lack motivation or energy, I usually…
A) Reconnect with why the task matters and keep going.
B) Move to an easier part first so I can maintain momentum.
C) Step back because forcing it can reduce the quality of my work.
D) Wait for my energy to return somewhat before pushing harder.

12

When competition rules suddenly change near the final stage, I usually…
A) Finish the work in its current form because there may be limited time to adapt.
B) Keep the same core approach but improve how it is presented.
C) Rework the project so it aligns better with the new requirements.
D) Consider scaling back or withdrawing if the changes alter the situation too much.

13

When I am praised for good work, I usually…
A) Take it as motivation to keep growing.
B) Feel pleased and aim to maintain the same level consistently.
C) Appreciate it and continue working steadily as before.
D) Feel self-conscious and prefer less attention next time.

14

I am offered a high-visibility task with real risk of failure. I usually…
A) Assess the risks, clarify expectations, and take it if I see a realistic path to doing it well.
B) Accept it because it could be a strong opportunity, even if the risk is real.
C) Wait a bit to see whether expectations become clearer before committing.
D) Prefer tasks with lower uncertainty and more predictable success criteria.

15

When I imagine my ideal career path, I see myself mainly as someone who…
A) Makes decisions that meaningfully influence outcomes and people.
B) Builds deep expertise and becomes a trusted specialist.
C) Contributes through a stable role with clearly defined responsibility.
D) Seeks work that is calm, steady, and less pressure-intensive.

16

When I notice something unfair, but speaking up may complicate my life, I usually…
A) Stay cautious about getting involved unless the issue directly affects me.
B) Speak up because staying silent feels wrong when someone may be harmed.
C) Assume it may be better handled by people closer to the issue.
D) At least support the person affected, even if I do not escalate the issue.

17

If I feel that someone takes my help for granted, I usually…
A) Explain that my help is voluntary and set clearer boundaries.
B) Reduce how much I rely on that relationship in the future.
C) Pull back gradually because I do not want the same pattern to continue.
D) Keep helping, but adjust my expectations about appreciation.

18

The night before an exam, a classmate asks for all of my preparation materials, but I still need them myself. I usually…
A) Share the most useful parts or explain the key topics while keeping enough structure for my own preparation.
B) Send most of what I have, even if it makes my own preparation less efficient.
C) Say I need to protect my own preparation first and cannot really share right now.
D) Reply later once I finish organizing my own preparation.

19

During an internship, I notice that students are regularly given work that mainly replaces paid staff tasks. I usually…
A) Collect perspectives from other interns and prepare a constructive message together.
B) Treat it as something that may simply be part of internship reality.
C) Finish the internship quietly and use the experience to judge future opportunities better.
D) Start with a calm, honest conversation with the supervisor.

20

I find out that negative student feedback is being removed from a summary before decision-makers see it. I usually…
A) Raise the issue constructively and suggest that the feedback be categorized and reviewed rather than simply removed.
B) Question the process more openly if it seems the filtering is unfair.
C) Assume that summaries often simplify negative comments for practical reasons.
D) Stay outside the issue unless I am directly asked to comment.

21

A useful campus initiative exists, but most students ignore it. I have little authority and limited time. I usually…
A) Try one small, low-cost intervention to make participation easier or clearer and see whether it helps.
B) Support the initiative personally, but do not try to influence wider participation.
C) Point out the problem in conversation, but stop short of acting on it.
D) Leave the issue to the people who started the initiative.

22

If I am assigned to work with someone others describe as “difficult,” I usually…
A) Stay calm and cooperate without unnecessary emotional escalation.
B) Try to understand both their strengths and what may be behind their behavior.
C) Keep the interaction professional and task-focused.
D) Try to limit the collaboration as much as possible.

23

When someone shares a personal story that conflicts with my values, I usually…
A) Keep some distance because the values clash feels too strong for me.
B) Redirect the conversation politely if I feel too uncomfortable.
C) Avoid similar conversations with that person in the future.
D) Listen first without immediate judgment so I can understand the person more fully.

24

I notice that one student keeps missing opportunities because information reaches them later than it reaches others. I usually…
A) Think about how the information flow could be made clearer or more equal for everyone.
B) Help if they ask directly, but otherwise not get too involved.
C) Assume timing issues often depend on individual follow-through as well.
D) Focus mainly on managing my own opportunities well.

25

If I discover that someone gains unfair advantages mainly through connections, I usually…
A) See it as part of how many systems tend to work in practice.
B) Discuss the issue with others to understand whether anything constructive can be done.
C) Assume it is hard to change, even if it is frustrating.
D) Consider it unfair and be willing to name the problem openly when appropriate.

26

When I realize that my inaction contributed to a problem for someone else, I usually…
A) Think responsibility mainly lies with direct actions rather than inaction.
B) Accept that silence or inaction can also carry responsibility.
C) Feel people are mostly accountable for what they explicitly choose to do.
D) Reflect on what I could do differently next time.

27

When I hear the phrase “the end justifies the means,” I usually think…
A) Results often matter most in the end.
B) It depends strongly on the consequences and on what the means involve.
C) Sometimes difficult choices are unavoidable in real life.
D) If the means cause serious harm, the goal loses moral force.

28

A local problem affects students, but previous attempts to improve it have stalled. I usually…
A) Look for one realistic next step and who could help move it forward.
B) Analyze why the problem exists before deciding what action makes sense.
C) Doubt whether students have much leverage over issues like this.
D) Prefer the matter to be handled by officials or formal structures.

29

When choosing between two future paths — one more profitable and one more socially meaningful — I usually…
A) Look for a path that combines meaningful contribution with sustainable personal growth.
B) Prioritize financial stability first, even if the fit is not ideal.
C) Choose the more meaningful direction, even if the path still needs to be figured out.
D) Keep options open and delay the choice until the direction feels clearer.

30

When I hear criticism of a community I care about, I usually…
A) Try to separate emotion from substance and think about what, if anything, should be improved.
B) Defend the community first and examine the criticism more carefully later.
C) Stay open to the criticism, though I may accept it too quickly at first.
D) Step back from the discussion and not engage much with it.

31

When I notice that someone in the team has withdrawn from the discussion, I usually…
A) Try to gently bring them in by asking an open question.
B) Check in more directly because it matters that they rejoin the process.
C) Assume teams can still work even if participation levels differ.
D) Give them space unless they signal that they want to come back in.

32

When a team discussion reaches a dead end because people disagree, I usually…
A) Ask for an outside perspective that could unlock a new angle.
B) Suggest naming the exact point of disagreement and working from there.
C) Use a quick vote so the team can keep moving.
D) Pause the discussion because it may not be productive right now.

33

When classmates suggest teaming up for a project or competition, I usually…
A) Prefer to work independently because I like having more control over the process.
B) Join if the roles and expectations are reasonably clear.
C) Feel positive about collaborating because strong coordination can improve the result.
D) Join and contribute where needed without taking a central role.

34

When someone in the group does not keep their promises, I usually…
A) Discuss what happened calmly and try to rebuild trust through clearer expectations.
B) Lower my expectations and rely more on myself next time.
C) Feel disappointed but prefer not to turn it into a bigger issue.
D) Raise it directly but respectfully, without making it personal.

35

When I come across new information, I usually…
A) Trust it provisionally if the source seems reliable enough.
B) Verify it if something about it feels uncertain.
C) Think about who is saying it, why they are saying it, and where it comes from.
D) Accept that some uncertainty is unavoidable and not everything can be checked fully.

36

When someone points out my mistake, I usually…
A) Listen carefully because others may notice something I missed.
B) First feel that the criticism may be stronger than necessary.
C) Try not to dwell on it too much because criticism is uncomfortable.
D) Feel defensive at first, but then try to use the feedback constructively.

37

When I am asked to do something unfamiliar, I usually…
A) Hesitate because unfamiliar tasks can expose what I do not yet know.
B) Accept that I may not succeed immediately and stay steady while learning.
C) Prefer tasks where I already understand the basics well.
D) Agree to it, though I may worry a lot about getting it wrong.

38

When I think about future success, I usually believe that…
A) Believe my effort will strongly shape what I achieve.
B) Think circumstances often matter more than effort.
C) Believe persistence gives me a reasonable chance, even when the path is uncertain.
D) Feel that some outcomes are mostly determined by factors outside personal control.

39

When I feel envy, I usually…
A) Notice the feeling and ask myself what I can improve in my own path.
B) Focus for a while on how unfair the situation feels.
C) Keep the feeling private and let it pass on its own.
D) Redirect my attention so I can calm down and reset.

40

When I feel irritated by other people, I usually…
A) Step away briefly so I do not react too quickly.
B) Keep the irritation hidden, even if it continues building inside.
C) Acknowledge the feeling and think about what exactly triggered it.
D) Treat irritation as a normal signal and move on without overanalyzing it.

## Question option metrics

`M`, `P`, `R`, `L`, `V` — оси оценки, которые накапливаются в зависимости от выбранного ответа.

QUESTION_OPTION_METRICS
```json
{
    1: {
        "A": {"M": 0, "P": 1, "R": 0, "L": 3, "V": 1},
        "B": {"M": 0, "P": 2, "R": 0, "L": 1, "V": 0},
        "C": {"M": 0, "P": 0, "R": 0, "L": 2, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    2: {
        "A": {"M": 0, "P": 1, "R": 0, "L": 1, "V": 0},
        "B": {"M": 0, "P": 1, "R": 0, "L": 2, "V": 0},
        "C": {"M": 0, "P": 0, "R": 0, "L": 3, "V": 0},
        "D": {"M": 0, "P": 1, "R": 0, "L": 0, "V": 0},
    },
    3: {
        "A": {"M": 0, "P": 2, "R": 2, "L": 1, "V": 0},
        "B": {"M": 0, "P": 2, "R": 1, "L": 0, "V": 0},
        "C": {"M": 0, "P": 1, "R": 1, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    4: {
        "A": {"M": 0, "P": 0, "R": 0, "L": 2, "V": 2},
        "B": {"M": 0, "P": 1, "R": 0, "L": 1, "V": 1},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 1},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    5: {
        "A": {"M": 0, "P": 1, "R": 0, "L": 0, "V": 1},
        "B": {"M": 0, "P": 2, "R": 0, "L": 1, "V": 2},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    6: {
        "A": {"M": 0, "P": 2, "R": 0, "L": 2, "V": 1},
        "B": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 0},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 1, "V": 0},
    },
    7: {
        "A": {"M": 1, "P": 0, "R": 3, "L": 0, "V": 0},
        "B": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "C": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 0},
        "D": {"M": 0, "P": 1, "R": 2, "L": 0, "V": 0},
    },
    8: {
        "A": {"M": 2, "P": 2, "R": 0, "L": 0, "V": 0},
        "B": {"M": 1, "P": 1, "R": 0, "L": 0, "V": 0},
        "C": {"M": 1, "P": 1, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    9: {
        "A": {"M": 0, "P": 3, "R": 1, "L": 0, "V": 0},
        "B": {"M": 0, "P": 1, "R": 0, "L": 0, "V": 0},
        "C": {"M": 0, "P": 1, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    10: {
        "A": {"M": 0, "P": 1, "R": 2, "L": 0, "V": 0},
        "B": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 0},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 3, "R": 1, "L": 0, "V": 0},
    },
    11: {
        "A": {"M": 3, "P": 0, "R": 2, "L": 0, "V": 0},
        "B": {"M": 1, "P": 1, "R": 1, "L": 0, "V": 0},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 0},
    },
    12: {
        "A": {"M": 0, "P": 1, "R": 1, "L": 0, "V": 0},
        "B": {"M": 0, "P": 1, "R": 2, "L": 0, "V": 0},
        "C": {"M": 0, "P": 1, "R": 3, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    13: {
        "A": {"M": 2, "P": 0, "R": 1, "L": 0, "V": 0},
        "B": {"M": 1, "P": 1, "R": 0, "L": 0, "V": 0},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    14: {
        "A": {"M": 1, "P": 2, "R": 2, "L": 2, "V": 0},
        "B": {"M": 1, "P": 0, "R": 1, "L": 1, "V": 0},
        "C": {"M": 0, "P": 1, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    15: {
        "A": {"M": 1, "P": 0, "R": 0, "L": 3, "V": 0},
        "B": {"M": 1, "P": 1, "R": 0, "L": 0, "V": 0},
        "C": {"M": 0, "P": 1, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    16: {
        "A": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 1},
        "B": {"M": 0, "P": 0, "R": 0, "L": 1, "V": 3},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 2},
    },
    17: {
        "A": {"M": 0, "P": 0, "R": 1, "L": 1, "V": 3},
        "B": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 0},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 1},
        "D": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 1},
    },
    18: {
        "A": {"M": 0, "P": 1, "R": 0, "L": 0, "V": 3},
        "B": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 1},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 1, "R": 0, "L": 0, "V": 0},
    },
    19: {
        "A": {"M": 0, "P": 1, "R": 0, "L": 2, "V": 3},
        "B": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "C": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 1, "V": 2},
    },
    20: {
        "A": {"M": 0, "P": 1, "R": 0, "L": 1, "V": 3},
        "B": {"M": 0, "P": 0, "R": 0, "L": 1, "V": 2},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    21: {
        "A": {"M": 0, "P": 1, "R": 0, "L": 3, "V": 0},
        "B": {"M": 1, "P": 0, "R": 0, "L": 0, "V": 1},
        "C": {"M": 0, "P": 0, "R": 0, "L": 1, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    22: {
        "A": {"M": 0, "P": 0, "R": 2, "L": 0, "V": 1},
        "B": {"M": 0, "P": 0, "R": 2, "L": 1, "V": 2},
        "C": {"M": 0, "P": 1, "R": 1, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    23: {
        "A": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "B": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 1},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 3},
    },
    24: {
        "A": {"M": 0, "P": 1, "R": 0, "L": 1, "V": 3},
        "B": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 1},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    25: {
        "A": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "B": {"M": 0, "P": 0, "R": 0, "L": 1, "V": 2},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 1},
        "D": {"M": 0, "P": 0, "R": 0, "L": 1, "V": 3},
    },
    26: {
        "A": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "B": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 3},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 2},
    },
    27: {
        "A": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "B": {"M": 0, "P": 1, "R": 0, "L": 0, "V": 2},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 1},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 3},
    },
    28: {
        "A": {"M": 0, "P": 1, "R": 1, "L": 3, "V": 0},
        "B": {"M": 0, "P": 2, "R": 0, "L": 1, "V": 0},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    29: {
        "A": {"M": 2, "P": 1, "R": 0, "L": 0, "V": 2},
        "B": {"M": 1, "P": 1, "R": 0, "L": 0, "V": 0},
        "C": {"M": 2, "P": 0, "R": 0, "L": 0, "V": 1},
        "D": {"M": 0, "P": 1, "R": 0, "L": 0, "V": 0},
    },
    30: {
        "A": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 3},
        "B": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 1},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 1},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    31: {
        "A": {"M": 0, "P": 0, "R": 0, "L": 2, "V": 1},
        "B": {"M": 0, "P": 0, "R": 0, "L": 3, "V": 1},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 1},
    },
    32: {
        "A": {"M": 0, "P": 1, "R": 0, "L": 2, "V": 0},
        "B": {"M": 0, "P": 1, "R": 0, "L": 2, "V": 1},
        "C": {"M": 0, "P": 0, "R": 0, "L": 1, "V": 0},
        "D": {"M": 0, "P": 1, "R": 0, "L": 0, "V": 0},
    },
    33: {
        "A": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "B": {"M": 0, "P": 1, "R": 0, "L": 1, "V": 0},
        "C": {"M": 0, "P": 0, "R": 0, "L": 3, "V": 1},
        "D": {"M": 0, "P": 0, "R": 0, "L": 1, "V": 1},
    },
    34: {
        "A": {"M": 0, "P": 0, "R": 0, "L": 2, "V": 2},
        "B": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 0},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 2, "V": 1},
    },
    35: {
        "A": {"M": 0, "P": 1, "R": 0, "L": 0, "V": 0},
        "B": {"M": 0, "P": 2, "R": 0, "L": 0, "V": 0},
        "C": {"M": 0, "P": 3, "R": 0, "L": 0, "V": 1},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    36: {
        "A": {"M": 0, "P": 0, "R": 3, "L": 0, "V": 1},
        "B": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "C": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 2, "L": 0, "V": 1},
    },
    37: {
        "A": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "B": {"M": 1, "P": 0, "R": 3, "L": 0, "V": 0},
        "C": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 0},
    },
    38: {
        "A": {"M": 2, "P": 0, "R": 2, "L": 0, "V": 0},
        "B": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "C": {"M": 1, "P": 0, "R": 2, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
    },
    39: {
        "A": {"M": 1, "P": 0, "R": 2, "L": 0, "V": 0},
        "B": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "C": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 2, "L": 0, "V": 0},
    },
    40: {
        "A": {"M": 0, "P": 0, "R": 2, "L": 0, "V": 0},
        "B": {"M": 0, "P": 0, "R": 0, "L": 0, "V": 0},
        "C": {"M": 0, "P": 0, "R": 3, "L": 0, "V": 0},
        "D": {"M": 0, "P": 0, "R": 1, "L": 0, "V": 0},
    },
}
```

## Scoring helpers (Python)

```py

# Формат:
# QUESTION_OPTION_METRICS = {
#     1: {
#         "A": {"M": 0, "P": 1, "R": 0, "L": 3, "V": 1},
#         "B": {"M": 0, "P": 2, "R": 0, "L": 1, "V": 0},
#         ...
#     },
#     ...
#     40: {...}
# }

AXES = ["M", "P", "R", "L", "V"]
ALLOWED_ANSWERS = {"A", "B", "C", "D"}


def compute_test_axis_max(question_option_metrics):
    """
    Считает максимальный возможный балл по каждой оси
    исходя из лучшего ответа на каждом вопросе.
    """
    axis_max = {axis: 0 for axis in AXES}

    for question_id, options in question_option_metrics.items():
        for axis in AXES:
            best_for_axis = max(
                options[option][axis]
                for option in ALLOWED_ANSWERS
            )
            axis_max[axis] += best_for_axis

    return axis_max


def compute_test_axis_raw(answers, question_option_metrics):
    """
    Суммирует реальный вклад выбранных ответов в оси M/P/R/L/V
    """
    axis_raw = {axis: 0 for axis in AXES}
    item_contributions = {}

    for question_id, selected_answer in answers.items():
        selected_metrics = question_option_metrics[question_id][selected_answer]

        # сохраняем вклад конкретного вопроса
        item_contributions[question_id] = selected_metrics

        # добавляем вклад в общие оси
        for axis in AXES:
            axis_raw[axis] += selected_metrics[axis]

    return axis_raw, item_contributions


def normalize_axis_scores(axis_raw, axis_max):
    """
    Переводит оси в шкалу 0..100
    """
    axis_norm = {}

    for axis in AXES:
        if axis_max[axis] == 0:
            axis_norm[axis] = 0.0
        else:
            axis_norm[axis] = round((axis_raw[axis] / axis_max[axis]) * 100, 2)

    return axis_norm
```

## Example scored test output
```json
{
  "candidate_id": "cand_001",
  "source": "test",
  "completed": true,
  "answered_count": 40,
  "missing_count": 0,
  "answers": {
    "1": "A",
    "2": "C",
    "3": "B",
    ...
    "40": "D"
  },
  "axis_raw": {
    "M": 18,
    "P": 26,
    "R": 29,
    "L": 34,
    "V": 31
  },
  "axis_max": {
    "M": 28,
    "P": 39,
    "R": 43,
    "L": 47,
    "V": 45
  },
  "axis_norm": {
    "M": 64.29,
    "P": 66.67,
    "R": 67.44,
    "L": 72.34,
    "V": 68.89
  }
}
```


## Test + LLM fusion
```json
{
  "fusion_per_axis": {
    "M": "0.45 * test_M + 0.55 * llm_M*25",
    "P": "0.55 * test_P + 0.45 * llm_P*25",
    "R": "0.45 * test_R + 0.55 * llm_R*25",
    "L": "0.40 * test_L + 0.60 * llm_L*25",
    "V": "0.55 * test_V + 0.45 * llm_V*25"
  }
}
```


## Final ranking modes

```json

{
  "final_score_formula": "final_score = w_M * M + w_P * P + w_R * R + w_L * L + w_V * V",
  "sorting_modes": {
    "balanced_leader": {
      "description": "Сбалансированный лидерский профиль без явных провалов по осям",
      "weights": {
        "M": 0.15,
        "P": 0.15,
        "R": 0.20,
        "L": 0.35,
        "V": 0.15
      },
      "hard_filters": {
        "L_min": 55,
        "R_min": 45,
        "V_min": 40
      },
      "score_formula": "0.15*M + 0.15*P + 0.20*R + 0.35*L + 0.15*V",
      "ranking_priority": ["final_score", "L", "R", "V"]
    },
    "strong_leadership": {
      "description": "Приоритет кандидатам с самым сильным лидерским сигналом и влиянием на команду",
      "weights": {
        "M": 0.10,
        "P": 0.10,
        "R": 0.20,
        "L": 0.45,
        "V": 0.15
      },
      "hard_filters": {
        "L_min": 65,
        "R_min": 45
      },
      "score_formula": "0.10*M + 0.10*P + 0.20*R + 0.45*L + 0.15*V",
      "ranking_priority": ["L", "final_score", "R"]
    },
    "high_potential_builder": {
      "description": "Приоритет тем, кто умеет двигаться в неопределенности, собирать структуру и доводить до движения",
      "weights": {
        "M": 0.15,
        "P": 0.20,
        "R": 0.25,
        "L": 0.30,
        "V": 0.10
      },
      "hard_filters": {
        "P_min": 50,
        "R_min": 50,
        "L_min": 50
      },
      "score_formula": "0.15*M + 0.20*P + 0.25*R + 0.30*L + 0.10*V",
      "ranking_priority": ["R", "P", "L", "final_score"]
    },
    "ethical_leader": {
      "description": "Приоритет лидерству с сильной ценностной и fairness-компонентой",
      "weights": {
        "M": 0.10,
        "P": 0.10,
        "R": 0.20,
        "L": 0.30,
        "V": 0.30
      },
      "hard_filters": {
        "L_min": 50,
        "V_min": 55
      },
      "score_formula": "0.10*M + 0.10*P + 0.20*R + 0.30*L + 0.30*V",
      "ranking_priority": ["V", "L", "final_score"]
    },
    "resilient_leader": {
      "description": "Приоритет тем, кто сохраняет движение под давлением и в трудностях",
      "weights": {
        "M": 0.10,
        "P": 0.10,
        "R": 0.35,
        "L": 0.30,
        "V": 0.15
      },
      "hard_filters": {
        "R_min": 60,
        "L_min": 50
      },
      "score_formula": "0.10*M + 0.10*P + 0.35*R + 0.30*L + 0.15*V",
      "ranking_priority": ["R", "L", "final_score"]
    },
    "execution_oriented": {
      "description": "Приоритет тем, кто лучше в структуре, исполнении и последовательном движении",
      "weights": {
        "M": 0.10,
        "P": 0.30,
        "R": 0.25,
        "L": 0.25,
        "V": 0.10
      },
      "hard_filters": {
        "P_min": 60,
        "R_min": 45
      },
      "score_formula": "0.10*M + 0.30*P + 0.25*R + 0.25*L + 0.10*V",
      "ranking_priority": ["P", "R", "final_score"]
    },
    "mission_driven": {
      "description": "Приоритет внутренней мотивации, осмысленности и ориентации на вклад",
      "weights": {
        "M": 0.30,
        "P": 0.10,
        "R": 0.20,
        "L": 0.25,
        "V": 0.15
      },
      "hard_filters": {
        "M_min": 60
      },
      "score_formula": "0.30*M + 0.10*P + 0.20*R + 0.25*L + 0.15*V",
      "ranking_priority": ["M", "L", "final_score"]
    }
  }
}
```